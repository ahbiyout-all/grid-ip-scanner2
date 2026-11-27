package com.gridipscanner2.app;

import android.content.Context;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.InterfaceAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Native Android HTTP + SSE LAN Scanner Engine for Grid IP Scanner2.
 * Runs locally on 127.0.0.1:3031 (or next free port) inside the Android APK process,
 * providing real Wi-Fi interface detection, concurrent TCP/ICMP host probing,
 * mDNS/SSDP discovery, ARP/neighbor cache MAC resolution, port scanning, and WoL.
 */
public class MobileEngineServer {
    private static final String TAG = "GridMobileEngine";
    private static final Pattern TITLE_PATTERN = Pattern.compile("(?is)<title[^>]*>(.*?)</title>");
    private static final int[] QUICK_PORTS = new int[]{
        80, 443, 22, 445, 139, 8080, 3389, 53, 631, 9100, 5000, 8443, 62078, 554, 1883, 8000
    };
    private static final int[] DEEP_EXTRA_PORTS = new int[]{
        21, 23, 25, 110, 135, 143, 161, 1900, 3306, 5353, 5355, 5432, 5900, 8899, 37777
    };

    private final Context appContext;
    private final ExecutorService clientPool = Executors.newCachedThreadPool();
    private final AtomicBoolean running = new AtomicBoolean(false);
    private ServerSocket serverSocket;
    private Thread acceptThread;
    private volatile int port = 3031;

    public MobileEngineServer(Context context) {
        this.appContext = context.getApplicationContext();
    }

    public int getPort() {
        return port;
    }

    public String getBaseUrl() {
        return "http://127.0.0.1:" + port;
    }

    public synchronized void start() {
        if (running.get()) return;
        ServerSocket bound = null;
        for (int candidate = 3031; candidate <= 3045; candidate++) {
            try {
                ServerSocket s = new ServerSocket();
                s.setReuseAddress(true);
                s.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), candidate), 64);
                bound = s;
                port = candidate;
                break;
            } catch (Exception ignored) {
            }
        }
        if (bound == null) {
            try {
                ServerSocket s = new ServerSocket(0, 64, InetAddress.getByName("127.0.0.1"));
                bound = s;
                port = s.getLocalPort();
            } catch (Exception e) {
                Log.e(TAG, "Failed to bind local mobile engine socket", e);
                return;
            }
        }

        serverSocket = bound;
        running.set(true);
        acceptThread = new Thread(() -> {
            while (running.get() && serverSocket != null && !serverSocket.isClosed()) {
                try {
                    Socket client = serverSocket.accept();
                    clientPool.execute(() -> handleClient(client));
                } catch (Exception e) {
                    if (running.get()) {
                        Log.w(TAG, "Accept error: " + e.getMessage());
                    }
                }
            }
        }, "GridMobileEngine-Accept");
        acceptThread.setDaemon(true);
        acceptThread.start();
        Log.i(TAG, "Native Android scan engine started on " + getBaseUrl());
    }

    public synchronized void stop() {
        running.set(false);
        try {
            if (serverSocket != null) serverSocket.close();
        } catch (Exception ignored) {
        }
        serverSocket = null;
    }

    private void handleClient(Socket socket) {
        try (Socket s = socket) {
            s.setSoTimeout(30000);
            InputStream in = s.getInputStream();
            OutputStream out = s.getOutputStream();

            BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            String requestLine = reader.readLine();
            if (requestLine == null || requestLine.isEmpty()) return;

            String[] parts = requestLine.split(" ");
            String method = parts.length >= 1 ? parts[0].toUpperCase(Locale.US) : "GET";
            String rawTarget = parts.length >= 2 ? parts[1] : "/";

            int contentLength = 0;
            String headerLine;
            while ((headerLine = reader.readLine()) != null && !headerLine.isEmpty()) {
                String lower = headerLine.toLowerCase(Locale.US);
                if (lower.startsWith("content-length:")) {
                    try {
                        contentLength = Integer.parseInt(headerLine.substring("content-length:".length()).trim());
                    } catch (NumberFormatException ignored) {
                    }
                }
            }

            String requestBody = "";
            if (contentLength > 0 && contentLength <= 4 * 1024 * 1024) {
                char[] buf = new char[contentLength];
                int readTotal = 0;
                while (readTotal < contentLength) {
                    int n = reader.read(buf, readTotal, contentLength - readTotal);
                    if (n < 0) break;
                    readTotal += n;
                }
                requestBody = new String(buf, 0, readTotal);
            }

            String path = rawTarget;
            String queryStr = "";
            int qIdx = rawTarget.indexOf('?');
            if (qIdx >= 0) {
                path = rawTarget.substring(0, qIdx);
                queryStr = rawTarget.substring(qIdx + 1);
            }
            Map<String, String> query = parseQuery(queryStr);

            if ("OPTIONS".equals(method)) {
                writeJsonResponse(out, 200, "{}");
                return;
            }

            switch (path) {
                case "/api/heartbeat":
                    writeJsonResponse(out, 200, "{\"ok\":true,\"engine\":\"android-native\",\"port\":" + port + "}");
                    break;
                case "/api/info":
                    writeJsonResponse(out, 200, buildInfoJson().toString());
                    break;
                case "/api/subnets/discover":
                    writeJsonResponse(out, 200, buildDiscoverSubnetsJson().toString());
                    break;
                case "/api/scan":
                    handleScanSse(s, out, query);
                    break;
                case "/api/portscan":
                    writeJsonResponse(out, 200, handlePortScan(query).toString());
                    break;
                case "/api/native-modules":
                    writeJsonResponse(out, 200, "{\"probeEngine\":true,\"portIocp\":false,\"discovery\":true,\"ouiTrie\":false,\"bannerGrabber\":true,\"pcapAnalyzer\":false,\"fingerprintEngine\":false,\"topologyGuard\":false,\"npcapLoaded\":false,\"androidNative\":true}");
                    break;
                case "/api/license":
                    writeJsonResponse(out, 200, "{\"tier\":\"free\",\"valid\":false,\"active\":false,\"features\":{\"maxCidrPrefix\":24}}");
                    break;
                case "/api/aliases":
                    handleAliases(out, method, requestBody);
                    break;
                case "/api/wol":
                    handleWol(out, method, query, requestBody);
                    break;
                case "/api/tray/state":
                    writeJsonResponse(out, 200, "{\"success\":true,\"state\":{\"mode\":\"standby\",\"pendingActions\":[]}}");
                    break;
                default:
                    writeJsonResponse(out, 404, "{\"error\":\"Not found\",\"path\":\"" + escapeJson(path) + "\"}");
                    break;
            }
        } catch (Exception e) {
            Log.d(TAG, "Client handler finished: " + e.getMessage());
        }
    }

    private void writeJsonResponse(OutputStream out, int statusCode, String jsonBody) throws Exception {
        byte[] bodyBytes = jsonBody.getBytes(StandardCharsets.UTF_8);
        String statusText = statusCode == 200 ? "OK" : (statusCode == 400 ? "Bad Request" : (statusCode == 404 ? "Not Found" : "Error"));
        String headers =
            "HTTP/1.1 " + statusCode + " " + statusText + "\r\n" +
            "Content-Type: application/json; charset=utf-8\r\n" +
            "Content-Length: " + bodyBytes.length + "\r\n" +
            "Access-Control-Allow-Origin: *\r\n" +
            "Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\n" +
            "Access-Control-Allow-Headers: Content-Type\r\n" +
            "Cache-Control: no-store\r\n" +
            "Connection: close\r\n\r\n";
        out.write(headers.getBytes(StandardCharsets.US_ASCII));
        out.write(bodyBytes);
        out.flush();
    }

    private void writeSseEvent(OutputStream out, String payload) throws Exception {
        byte[] bytes = ("data: " + payload + "\n\n").getBytes(StandardCharsets.UTF_8);
        synchronized (out) {
            out.write(bytes);
            out.flush();
        }
    }

    private void handleScanSse(Socket clientSocket, OutputStream out, Map<String, String> query) throws Exception {
        String rawCidr = safeTrim(query.get("cidr"));
        String rawSubnet = safeTrim(query.get("subnet"));
        String rawInput = !rawCidr.isEmpty() ? rawCidr : rawSubnet;
        if (rawInput.isEmpty()) {
            rawInput = getDefaultSubnet();
        }

        int startHint = clampInt(parseIntOr(query.get("start"), 1), 0, 255);
        int endHint = clampInt(parseIntOr(query.get("end"), 254), 0, 255);
        boolean deepScan = "true".equalsIgnoreCase(safeTrim(query.get("deep")));
        int delayMs = clampInt(parseIntOr(query.get("delay"), 0), 0, 2000);
        int timeoutMs = clampInt(parseIntOr(query.get("timeout"), 500), 150, 5000);

        List<CidrBlock> blocks = parseCidrBlocks(rawInput, startHint, endHint);
        if (blocks.isEmpty()) {
            writeJsonResponse(out, 400, "{\"error\":\"Invalid subnet or CIDR format\"}");
            return;
        }

        List<String> targetIps = new ArrayList<>();
        for (CidrBlock blk : blocks) {
            for (int i = blk.start; i <= blk.end; i++) {
                targetIps.add(blk.subnet + "." + i);
            }
        }

        // Switch socket timeout off / long for SSE streaming
        clientSocket.setSoTimeout(0);

        String headers =
            "HTTP/1.1 200 OK\r\n" +
            "Content-Type: text/event-stream; charset=utf-8\r\n" +
            "Cache-Control: no-cache, no-transform\r\n" +
            "Connection: keep-alive\r\n" +
            "Access-Control-Allow-Origin: *\r\n" +
            "Access-Control-Allow-Methods: GET, OPTIONS\r\n" +
            "Access-Control-Allow-Headers: Content-Type\r\n" +
            "X-Accel-Buffering: no\r\n\r\n";
        out.write(headers.getBytes(StandardCharsets.US_ASCII));
        out.write(": scan-stream-started\n\n".getBytes(StandardCharsets.UTF_8));
        out.flush();

        JSONObject planObj = new JSONObject();
        planObj.put("type", "plan");
        JSONObject planMeta = new JSONObject();
        planMeta.put("totalHosts", targetIps.size());
        planObj.put("plan", planMeta);
        writeSseEvent(out, planObj.toString());

        // Preload ARP/neighbor table & multicast SSDP/mDNS hints in parallel
        final Map<String, String> arpMap = readNeighborMacTable();
        final Map<String, String> ssdpMap = new ConcurrentHashMap<>();
        final Map<String, String> mdnsMap = new ConcurrentHashMap<>();
        Thread discoveryThread = new Thread(() -> {
            runQuickSsdpProbe(ssdpMap);
            runQuickMdnsProbe(mdnsMap);
        });
        discoveryThread.start();
        try {
            discoveryThread.join(450);
        } catch (InterruptedException ignored) {
        }

        // Refresh ARP map once more after multicast burst
        Map<String, String> arpAfter = readNeighborMacTable();
        arpMap.putAll(arpAfter);

        final Map<String, String> localIfMacs = getLocalInterfaceIpToMac();
        int workerCount = deepScan ? 24 : 40;
        if (delayMs > 0) workerCount = 12;
        ExecutorService scanPool = Executors.newFixedThreadPool(workerCount);
        AtomicBoolean aborted = new AtomicBoolean(false);

        try {
            List<Future<?>> futures = new ArrayList<>(targetIps.size());
            for (final String ip : targetIps) {
                futures.add(scanPool.submit(() -> {
                    if (aborted.get() || clientSocket.isClosed()) return;
                    try {
                        JSONObject scanningMsg = new JSONObject();
                        scanningMsg.put("type", "scanning");
                        scanningMsg.put("ip", ip);
                        writeSseEvent(out, scanningMsg.toString());

                        if (delayMs > 0) {
                            Thread.sleep(delayMs);
                        }

                        JSONObject resultData = probeSingleHost(
                            ip, timeoutMs, deepScan, arpMap, ssdpMap, mdnsMap, localIfMacs
                        );

                        JSONObject resMsg = new JSONObject();
                        resMsg.put("type", "result");
                        resMsg.put("data", resultData);
                        writeSseEvent(out, resMsg.toString());
                    } catch (Exception e) {
                        aborted.set(true);
                    }
                }));
            }

            for (Future<?> f : futures) {
                if (aborted.get()) break;
                try {
                    f.get();
                } catch (Exception ignored) {
                }
            }

            if (!aborted.get() && !clientSocket.isClosed()) {
                writeSseEvent(out, "{\"type\":\"complete\"}");
            }
        } finally {
            scanPool.shutdownNow();
        }
    }

    private JSONObject probeSingleHost(
        String ip,
        int timeoutMs,
        boolean deepScan,
        Map<String, String> arpMap,
        Map<String, String> ssdpMap,
        Map<String, String> mdnsMap,
        Map<String, String> localIfMacs
    ) {
        long t0 = System.nanoTime();
        boolean alive = false;
        int latencyMs = 0;
        List<Integer> openPorts = new ArrayList<>();

        boolean isLocalSelf = localIfMacs.containsKey(ip);
        if (isLocalSelf) {
            alive = true;
        }

        // 1. Concurrent TCP quick ports probe (works reliably on non-rooted Android even when ICMP is blocked)
        int[] portsToProbe = deepScan ? concatPorts(QUICK_PORTS, DEEP_EXTRA_PORTS) : new int[]{80, 443, 22, 445, 139, 8080, 3389, 53, 62078, 9100};
        int tcpTimeout = Math.min(Math.max(timeoutMs, 180), 650);

        ExecutorService portPool = Executors.newFixedThreadPool(Math.min(portsToProbe.length, 8));
        List<Future<Integer>> portFutures = new ArrayList<>(portsToProbe.length);
        for (final int p : portsToProbe) {
            portFutures.add(portPool.submit(() -> {
                try (Socket s = new Socket()) {
                    s.connect(new InetSocketAddress(ip, p), tcpTimeout);
                    return p;
                } catch (Exception e) {
                    return -1;
                }
            }));
        }
        for (Future<Integer> pf : portFutures) {
            try {
                int open = pf.get();
                if (open > 0) {
                    openPorts.add(open);
                    alive = true;
                }
            } catch (Exception ignored) {
            }
        }
        portPool.shutdownNow();

        // 2. Fallback ICMP/TCP-Echo reachability if no TCP ports responded
        if (!alive) {
            try {
                InetAddress addr = InetAddress.getByName(ip);
                if (addr.isReachable(Math.min(timeoutMs, 550))) {
                    alive = true;
                }
            } catch (Exception ignored) {
            }
        }

        String mac = localIfMacs.getOrDefault(ip, arpMap.getOrDefault(ip, ""));
        if (mac.isEmpty()) {
            // Re-check neighbor table lazily if host responded
            if (alive) {
                Map<String, String> latestArp = readNeighborMacTable();
                mac = latestArp.getOrDefault(ip, "");
            }
        }
        if (!alive && !mac.isEmpty()) {
            alive = true;
        }

        long elapsedMs = Math.max(1L, (System.nanoTime() - t0) / 1_000_000L);
        latencyMs = alive ? (int) elapsedMs : 0;

        String hostname = "";
        String webTitle = "";
        String upnp = ssdpMap.getOrDefault(ip, "");
        String mdns = mdnsMap.getOrDefault(ip, "");
        String nameSource = "";

        if (alive) {
            try {
                InetAddress addr = InetAddress.getByName(ip);
                String canonical = addr.getCanonicalHostName();
                if (canonical != null && !canonical.equals(ip) && !canonical.isEmpty()) {
                    hostname = canonical;
                    nameSource = "DNS";
                }
            } catch (Exception ignored) {
            }

            if (openPorts.contains(80) || openPorts.contains(8080) || openPorts.contains(8000)) {
                int httpPort = openPorts.contains(80) ? 80 : (openPorts.contains(8080) ? 8080 : 8000);
                webTitle = grabHttpTitle(ip, httpPort);
                if (hostname.isEmpty() && !webTitle.isEmpty()) {
                    nameSource = "WEB";
                }
            }
            if (!mdns.isEmpty() && hostname.isEmpty()) {
                hostname = mdns;
                nameSource = "MDNS";
            } else if (!upnp.isEmpty() && hostname.isEmpty()) {
                hostname = upnp;
                nameSource = "UPNP";
            }
            if (isLocalSelf && hostname.isEmpty()) {
                hostname = (Build.MANUFACTURER + " " + Build.MODEL).trim();
                nameSource = "LOCAL";
            }
        }

        Collections.sort(openPorts);

        JSONObject obj = new JSONObject();
        try {
            obj.put("ip", ip);
            obj.put("alive", alive);
            obj.put("latency", latencyMs);
            obj.put("mac", mac.isEmpty() ? "Unknown" : mac);
            obj.put("vendor", "");
            obj.put("hostname", hostname);
            obj.put("webTitle", webTitle);
            JSONArray portsArr = new JSONArray();
            for (int p : openPorts) portsArr.put(p);
            obj.put("openPorts", portsArr);
            obj.put("mdns", mdns);
            obj.put("upnp", upnp);
            obj.put("snmp", "");
            if (!nameSource.isEmpty()) obj.put("nameSource", nameSource);
        } catch (Exception ignored) {
        }
        return obj;
    }

    private String grabHttpTitle(String ip, int port) {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(ip, port), 500);
            s.setSoTimeout(600);
            OutputStream os = s.getOutputStream();
            String req = "GET / HTTP/1.0\r\nHost: " + ip + "\r\nUser-Agent: GridIPScanner2/2.7\r\nConnection: close\r\n\r\n";
            os.write(req.getBytes(StandardCharsets.US_ASCII));
            os.flush();

            InputStream is = s.getInputStream();
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] chunk = new byte[2048];
            int total = 0;
            int n;
            while (total < 16384 && (n = is.read(chunk)) > 0) {
                buf.write(chunk, 0, n);
                total += n;
            }
            String body = buf.toString(StandardCharsets.UTF_8.name());
            Matcher m = TITLE_PATTERN.matcher(body);
            if (m.find()) {
                String title = m.group(1).replaceAll("\\s+", " ").trim();
                if (title.length() > 64) title = title.substring(0, 61) + "...";
                return title;
            }
        } catch (Exception ignored) {
        }
        return "";
    }

    private JSONObject handlePortScan(Map<String, String> query) {
        JSONObject resp = new JSONObject();
        try {
            String ip = safeTrim(query.get("ip"));
            if (ip.isEmpty()) {
                resp.put("success", false);
                resp.put("error", "Missing IP parameter");
                return resp;
            }
            String portsParam = safeTrim(query.get("ports"));
            List<Integer> ports = new ArrayList<>();
            if (!portsParam.isEmpty()) {
                for (String token : portsParam.split(",")) {
                    try {
                        int p = Integer.parseInt(token.trim());
                        if (p >= 1 && p <= 65535) ports.add(p);
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
            if (ports.isEmpty()) {
                for (int p : QUICK_PORTS) ports.add(p);
                for (int p : DEEP_EXTRA_PORTS) ports.add(p);
            }
            int timeoutMs = clampInt(parseIntOr(query.get("timeout"), 500), 100, 4000);

            ExecutorService pool = Executors.newFixedThreadPool(Math.min(ports.size(), 24));
            List<Future<Integer>> futures = new ArrayList<>();
            for (final int p : ports) {
                futures.add(pool.submit(() -> {
                    try (Socket s = new Socket()) {
                        s.connect(new InetSocketAddress(ip, p), timeoutMs);
                        return p;
                    } catch (Exception e) {
                        return -1;
                    }
                }));
            }
            List<Integer> open = new ArrayList<>();
            for (Future<Integer> f : futures) {
                try {
                    int val = f.get();
                    if (val > 0) open.add(val);
                } catch (Exception ignored) {
                }
            }
            pool.shutdownNow();
            Collections.sort(open);
            JSONArray arr = new JSONArray();
            for (int p : open) arr.put(p);
            resp.put("success", true);
            resp.put("ip", ip);
            resp.put("openPorts", arr);
        } catch (Exception e) {
            try {
                resp.put("success", false);
                resp.put("error", e.getMessage());
            } catch (Exception ignored) {
            }
        }
        return resp;
    }

    private JSONObject buildInfoJson() {
        JSONObject info = new JSONObject();
        try {
            List<JSONObject> ifaceList = collectInterfaces();
            String bestIp = "127.0.0.1";
            String bestSubnet = "192.168.0";

            for (JSONObject item : ifaceList) {
                if (item.optBoolean("isDefault", false)) {
                    bestIp = item.optString("ip", bestIp);
                    bestSubnet = item.optString("subnet", bestSubnet);
                    break;
                }
            }
            if ("127.0.0.1".equals(bestIp)) {
                String wifiIp = getWifiManagerIp();
                if (!wifiIp.isEmpty()) {
                    bestIp = wifiIp;
                    bestSubnet = extractSubnetPrefix(wifiIp);
                    JSONObject syntheticWifi = new JSONObject();
                    syntheticWifi.put("name", "Wi-Fi (wlan0)");
                    syntheticWifi.put("ip", bestIp);
                    syntheticWifi.put("subnet", bestSubnet);
                    syntheticWifi.put("cidr", bestIp + "/24");
                    syntheticWifi.put("status", "up");
                    syntheticWifi.put("type", "physical");
                    syntheticWifi.put("mtu", 1500);
                    syntheticWifi.put("isDefault", true);
                    ifaceList.add(0, syntheticWifi);
                }
            }

            JSONArray arr = new JSONArray();
            for (JSONObject item : ifaceList) arr.put(item);

            String deviceName = ((Build.MANUFACTURER != null ? Build.MANUFACTURER : "") + " " +
                (Build.MODEL != null ? Build.MODEL : "Android")).trim();
            info.put("ip", bestIp);
            info.put("subnet", bestSubnet);
            info.put("interfaces", arr);
            info.put("isAdmin", false);
            info.put("ouiCount", 36000);
            info.put("ouiSource", "Android Native Engine + Client IEEE OUI");
            info.put("ouiCachePath", "");
            info.put("ouiDatabaseLocation", "Android Embedded Engine");
            info.put("computerName", deviceName.isEmpty() ? "Android Mobile" : deviceName);
        } catch (Exception e) {
            Log.w(TAG, "buildInfoJson error: " + e.getMessage());
        }
        return info;
    }

    private JSONObject buildDiscoverSubnetsJson() {
        JSONObject res = new JSONObject();
        try {
            List<JSONObject> ifaces = collectInterfaces();
            JSONArray candidates = new JSONArray();
            for (JSONObject iface : ifaces) {
                String type = iface.optString("type", "other");
                if ("loopback".equals(type)) continue;
                JSONObject cand = new JSONObject();
                cand.put("interfaceName", iface.optString("name", ""));
                cand.put("ip", iface.optString("ip", ""));
                cand.put("subnet", iface.optString("subnet", ""));
                cand.put("cidr", iface.optString("cidr", ""));
                cand.put("type", type);
                cand.put("status", iface.optString("status", "up"));
                candidates.put(cand);
            }
            res.put("success", true);
            res.put("candidates", candidates);
        } catch (Exception e) {
            try {
                res.put("success", false);
                res.put("candidates", new JSONArray());
            } catch (Exception ignored) {
            }
        }
        return res;
    }

    private List<JSONObject> collectInterfaces() {
        List<JSONObject> list = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> ifaces = NetworkInterface.getNetworkInterfaces();
            if (ifaces == null) return list;

            boolean defaultAssigned = false;
            while (ifaces.hasMoreElements()) {
                NetworkInterface nif = ifaces.nextElement();
                if (!nif.isUp()) continue;
                String name = nif.getName() != null ? nif.getName() : "nic";
                String lower = name.toLowerCase(Locale.US);

                String ipv4 = "";
                int prefix = 24;
                for (InterfaceAddress ia : nif.getInterfaceAddresses()) {
                    if (ia.getAddress() instanceof Inet4Address) {
                        ipv4 = ia.getAddress().getHostAddress();
                        prefix = ia.getNetworkPrefixLength();
                        if (prefix <= 0 || prefix > 32) prefix = 24;
                        break;
                    }
                }
                if (ipv4.isEmpty()) continue;

                String type = "other";
                if (nif.isLoopback() || lower.startsWith("lo")) {
                    type = "loopback";
                } else if (lower.startsWith("tun") || lower.startsWith("tap") || lower.startsWith("ppp") || lower.startsWith("wg")) {
                    type = "vpn";
                } else if (lower.startsWith("wlan") || lower.startsWith("eth") || lower.startsWith("en") || lower.startsWith("swlan")) {
                    type = "physical";
                } else if (lower.startsWith("rmnet") || lower.startsWith("ccmni") || lower.startsWith("v4-")) {
                    type = "physical";
                } else if (lower.contains("bridge") || lower.contains("veth") || lower.contains("docker")) {
                    type = "virtual";
                }

                String macStr = "";
                try {
                    byte[] macBytes = nif.getHardwareAddr();
                    if (macBytes != null && macBytes.length == 6) {
                        StringBuilder sb = new StringBuilder();
                        for (int i = 0; i < 6; i++) {
                            if (i > 0) sb.append(':');
                            sb.append(String.format(Locale.US, "%02X", macBytes[i]));
                        }
                        macStr = sb.toString();
                    }
                } catch (Exception ignored) {
                }

                boolean isPrivateV4 = isPrivateIPv4(ipv4);
                boolean isDefault = !defaultAssigned && ("physical".equals(type) || lower.startsWith("wlan")) && isPrivateV4 && !ipv4.startsWith("127.");
                if (isDefault) defaultAssigned = true;

                JSONObject obj = new JSONObject();
                obj.put("name", lower.startsWith("wlan") ? "Wi-Fi (" + name + ")" : name);
                obj.put("ip", ipv4);
                obj.put("subnet", extractSubnetPrefix(ipv4));
                obj.put("cidr", ipv4 + "/" + prefix);
                if (!macStr.isEmpty()) obj.put("mac", macStr);
                obj.put("status", "up");
                obj.put("type", type);
                obj.put("mtu", nif.getMTU());
                obj.put("isDefault", isDefault);
                list.add(obj);
            }
        } catch (Exception e) {
            Log.w(TAG, "collectInterfaces failed: " + e.getMessage());
        }
        return list;
    }

    private String getWifiManagerIp() {
        try {
            WifiManager wm = (WifiManager) appContext.getSystemService(Context.WIFI_SERVICE);
            if (wm != null) {
                WifiInfo wi = wm.getConnectionInfo();
                if (wi != null) {
                    int ipInt = wi.getIpAddress();
                    if (ipInt != 0) {
                        return String.format(Locale.US, "%d.%d.%d.%d",
                            (ipInt & 0xff), (ipInt >> 8 & 0xff), (ipInt >> 16 & 0xff), (ipInt >> 24 & 0xff));
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return "";
    }

    private String getDefaultSubnet() {
        List<JSONObject> list = collectInterfaces();
        for (JSONObject item : list) {
            if (item.optBoolean("isDefault", false)) {
                return item.optString("subnet", "192.168.0");
            }
        }
        String wifiIp = getWifiManagerIp();
        if (!wifiIp.isEmpty()) return extractSubnetPrefix(wifiIp);
        return "192.168.0";
    }

    private Map<String, String> getLocalInterfaceIpToMac() {
        Map<String, String> map = new HashMap<>();
        for (JSONObject item : collectInterfaces()) {
            String ip = item.optString("ip", "");
            String mac = item.optString("mac", "");
            if (!ip.isEmpty() && !mac.isEmpty()) {
                map.put(ip, mac);
            }
        }
        return map;
    }

    private Map<String, String> readNeighborMacTable() {
        Map<String, String> map = new HashMap<>();
        // 1. Try /proc/net/arp (works on Android <= 9 / some ROMs)
        File arpFile = new File("/proc/net/arp");
        if (arpFile.exists() && arpFile.canRead()) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(new FileInputStream(arpFile), StandardCharsets.UTF_8))) {
                String line;
                boolean first = true;
                while ((line = br.readLine()) != null) {
                    if (first) {
                        first = false;
                        continue;
                    }
                    String[] cols = line.trim().split("\\s+");
                    if (cols.length >= 4) {
                        String ip = cols[0];
                        String mac = cols[3].toUpperCase(Locale.US).replace('-', ':');
                        if (isValidMac(mac) && !"00:00:00:00:00:00".equals(mac)) {
                            map.put(ip, mac);
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }

        // 2. Try `ip neigh show` fallback
        if (map.isEmpty()) {
            Process proc = null;
            try {
                proc = new ProcessBuilder("ip", "neigh", "show").start();
                try (BufferedReader br = new BufferedReader(new InputStreamReader(proc.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        String[] parts = line.trim().split("\\s+");
                        if (parts.length >= 5) {
                            String ip = parts[0];
                            for (int i = 1; i < parts.length - 1; i++) {
                                if ("lladdr".equalsIgnoreCase(parts[i])) {
                                    String mac = parts[i + 1].toUpperCase(Locale.US);
                                    if (isValidMac(mac)) {
                                        map.put(ip, mac);
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            } catch (Exception ignored) {
            } finally {
                if (proc != null) proc.destroy();
            }
        }
        return map;
    }

    private void runQuickSsdpProbe(Map<String, String> ssdpMap) {
        WifiManager.MulticastLock lock = acquireMulticastLock();
        try (DatagramSocket sock = new DatagramSocket()) {
            sock.setSoTimeout(350);
            String msg = "M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: \"ssdp:discover\"\r\nMX: 1\r\nST: ssdp:all\r\n\r\n";
            byte[] data = msg.getBytes(StandardCharsets.US_ASCII);
            DatagramPacket pkt = new DatagramPacket(data, data.length, InetAddress.getByName("239.255.255.250"), 1900);
            sock.send(pkt);

            long deadline = System.currentTimeMillis() + 350;
            byte[] buf = new byte[2048];
            while (System.currentTimeMillis() < deadline) {
                DatagramPacket resp = new DatagramPacket(buf, buf.length);
                sock.receive(resp);
                String srcIp = resp.getAddress().getHostAddress();
                String payload = new String(resp.getData(), 0, resp.getLength(), StandardCharsets.UTF_8);
                for (String line : payload.split("\r?\n")) {
                    if (line.toUpperCase(Locale.US).startsWith("SERVER:")) {
                        String srv = line.substring(7).trim();
                        if (!srv.isEmpty()) ssdpMap.putIfAbsent(srcIp, srv);
                        break;
                    }
                }
            }
        } catch (Exception ignored) {
        } finally {
            releaseMulticastLock(lock);
        }
    }

    private void runQuickMdnsProbe(Map<String, String> mdnsMap) {
        WifiManager.MulticastLock lock = acquireMulticastLock();
        try (DatagramSocket sock = new DatagramSocket()) {
            sock.setSoTimeout(250);
            // Minimal DNS-SD PTR query for _services._dns-sd._udp.local
            byte[] query = new byte[]{
                0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x09, '_', 's', 'e', 'r', 'v', 'i', 'c', 'e', 's',
                0x07, '_', 'd', 'n', 's', '-', 's', 'd',
                0x04, '_', 'u', 'd', 'p',
                0x05, 'l', 'o', 'c', 'a', 'l', 0x00,
                0x00, 0x0c, 0x00, 0x01
            };
            DatagramPacket pkt = new DatagramPacket(query, query.length, InetAddress.getByName("224.0.0.251"), 5353);
            sock.send(pkt);
            long deadline = System.currentTimeMillis() + 250;
            byte[] buf = new byte[1500];
            while (System.currentTimeMillis() < deadline) {
                DatagramPacket resp = new DatagramPacket(buf, buf.length);
                sock.receive(resp);
                String srcIp = resp.getAddress().getHostAddress();
                if (!mdnsMap.containsKey(srcIp)) {
                    mdnsMap.put(srcIp, "mDNS Service");
                }
            }
        } catch (Exception ignored) {
        } finally {
            releaseMulticastLock(lock);
        }
    }

    private WifiManager.MulticastLock acquireMulticastLock() {
        try {
            WifiManager wm = (WifiManager) appContext.getSystemService(Context.WIFI_SERVICE);
            if (wm != null) {
                WifiManager.MulticastLock lock = wm.createMulticastLock("GridIPScanner2");
                lock.setReferenceCounted(false);
                lock.acquire();
                return lock;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private void releaseMulticastLock(WifiManager.MulticastLock lock) {
        if (lock != null) {
            try {
                if (lock.isHeld()) lock.release();
            } catch (Exception ignored) {
            }
        }
    }

    private void handleAliases(OutputStream out, String method, String body) throws Exception {
        File aliasFile = new File(appContext.getFilesDir(), "aliases.json");
        if ("GET".equals(method)) {
            if (!aliasFile.exists()) {
                writeJsonResponse(out, 200, "{}");
                return;
            }
            byte[] data = readAllBytes(aliasFile);
            String text = data.length > 0 ? new String(data, StandardCharsets.UTF_8) : "{}";
            writeJsonResponse(out, 200, text);
            return;
        }
        if ("POST".equals(method)) {
            try {
                new JSONObject(body);
                try (FileOutputStream fos = new FileOutputStream(aliasFile)) {
                    fos.write(body.getBytes(StandardCharsets.UTF_8));
                }
                writeJsonResponse(out, 200, "{\"success\":true}");
            } catch (Exception e) {
                writeJsonResponse(out, 400, "{\"error\":\"Invalid JSON\"}");
            }
            return;
        }
        writeJsonResponse(out, 405, "{\"error\":\"Method not allowed\"}");
    }

    private void handleWol(OutputStream out, String method, Map<String, String> query, String body) throws Exception {
        if (!"POST".equals(method)) {
            writeJsonResponse(out, 405, "{\"success\":false,\"error\":\"Method not allowed\"}");
            return;
        }
        String mac = safeTrim(query.get("mac"));
        String ip = safeTrim(query.get("ip"));
        if (!body.isEmpty()) {
            try {
                JSONObject obj = new JSONObject(body);
                if (mac.isEmpty()) mac = safeTrim(obj.optString("mac", ""));
                if (ip.isEmpty()) ip = safeTrim(obj.optString("ip", ""));
            } catch (Exception ignored) {
            }
        }
        String hex = mac.replaceAll("[^0-9A-Fa-f]", "");
        if (hex.length() != 12) {
            writeJsonResponse(out, 400, "{\"success\":false,\"error\":\"Invalid MAC address\"}");
            return;
        }
        byte[] macBytes = new byte[6];
        for (int i = 0; i < 6; i++) {
            macBytes[i] = (byte) Integer.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
        }
        byte[] packet = new byte[102];
        for (int i = 0; i < 6; i++) packet[i] = (byte) 0xFF;
        for (int i = 0; i < 16; i++) System.arraycopy(macBytes, 0, packet, 6 + i * 6, 6);

        try (DatagramSocket sock = new DatagramSocket()) {
            sock.setBroadcast(true);
            String targetBcast = "255.255.255.255";
            if (!ip.isEmpty() && ip.contains(".")) {
                String prefix = extractSubnetPrefix(ip);
                if (!prefix.isEmpty()) targetBcast = prefix + ".255";
            }
            DatagramPacket p1 = new DatagramPacket(packet, packet.length, InetAddress.getByName(targetBcast), 9);
            DatagramPacket p2 = new DatagramPacket(packet, packet.length, InetAddress.getByName("255.255.255.255"), 9);
            sock.send(p1);
            sock.send(p2);
            writeJsonResponse(out, 200, "{\"success\":true,\"packetsSent\":2}");
        } catch (Exception e) {
            writeJsonResponse(out, 500, "{\"success\":false,\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private static final class CidrBlock {
        final String subnet;
        final int start;
        final int end;
        CidrBlock(String subnet, int start, int end) {
            this.subnet = subnet;
            this.start = start;
            this.end = end;
        }
    }

    private List<CidrBlock> parseCidrBlocks(String rawInput, int startHint, int endHint) {
        List<CidrBlock> list = new ArrayList<>();
        String clean = rawInput.trim();
        if (clean.contains("/")) {
            String[] parts = clean.split("/", 2);
            String ipPart = parts[0].trim();
            int prefix = clampInt(parseIntOr(parts[1].trim(), 24), 16, 32);
            String[] octets = ipPart.split("\\.");
            if (octets.length == 4) {
                long ipNum = 0;
                for (int i = 0; i < 4; i++) {
                    int o = clampInt(parseIntOr(octets[i], 0), 0, 255);
                    ipNum = (ipNum << 8) | o;
                }
                long mask = prefix == 0 ? 0 : (0xFFFFFFFFL << (32 - prefix)) & 0xFFFFFFFFL;
                long network = ipNum & mask;
                long broadcast = network | (~mask & 0xFFFFFFFFL);
                long firstHost = (prefix <= 30) ? network + 1 : network;
                long lastHost = (prefix <= 30) ? broadcast - 1 : broadcast;
                // Cap total hosts at 4096 for mobile responsiveness
                if (lastHost - firstHost > 4095) lastHost = firstHost + 4095;

                Map<String, int[]> grouped = new LinkedHashMap<>();
                for (long h = firstHost; h <= lastHost; h++) {
                    int a = (int) ((h >> 24) & 0xFF);
                    int b = (int) ((h >> 16) & 0xFF);
                    int c = (int) ((h >> 8) & 0xFF);
                    int d = (int) (h & 0xFF);
                    String sub = a + "." + b + "." + c;
                    int[] range = grouped.get(sub);
                    if (range == null) {
                        grouped.put(sub, new int[]{d, d});
                    } else {
                        if (d < range[0]) range[0] = d;
                        if (d > range[1]) range[1] = d;
                    }
                }
                for (Map.Entry<String, int[]> entry : grouped.entrySet()) {
                    list.add(new CidrBlock(entry.getKey(), entry.getValue()[0], entry.getValue()[1]));
                }
                return list;
            }
        }

        String[] octets = clean.split("\\.");
        if (octets.length >= 3) {
            String sub = clampInt(parseIntOr(octets[0], 192), 0, 255) + "." +
                clampInt(parseIntOr(octets[1], 168), 0, 255) + "." +
                clampInt(parseIntOr(octets[2], 0), 0, 255);
            int s = Math.min(startHint, endHint);
            int e = Math.max(startHint, endHint);
            list.add(new CidrBlock(sub, s, e));
        }
        return list;
    }

    private static Map<String, String> parseQuery(String queryStr) {
        Map<String, String> map = new HashMap<>();
        if (queryStr == null || queryStr.isEmpty()) return map;
        for (String pair : queryStr.split("&")) {
            int idx = pair.indexOf('=');
            if (idx > 0) {
                try {
                    String k = URLDecoder.decode(pair.substring(0, idx), "UTF-8");
                    String v = URLDecoder.decode(pair.substring(idx + 1), "UTF-8");
                    map.put(k, v);
                } catch (Exception ignored) {
                }
            }
        }
        return map;
    }

    private static byte[] readAllBytes(File file) throws Exception {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (FileInputStream fis = new FileInputStream(file)) {
            byte[] buf = new byte[4096];
            int n;
            while ((n = fis.read(buf)) >= 0) bos.write(buf, 0, n);
        }
        return bos.toByteArray();
    }

    private static int[] concatPorts(int[] a, int[] b) {
        int[] out = new int[a.length + b.length];
        System.arraycopy(a, 0, out, 0, a.length);
        System.arraycopy(b, 0, out, a.length, b.length);
        return out;
    }

    private static String extractSubnetPrefix(String ip) {
        String[] parts = ip.split("\\.");
        if (parts.length >= 3) return parts[0] + "." + parts[1] + "." + parts[2];
        return "";
    }

    private static boolean isPrivateIPv4(String ip) {
        return ip.startsWith("192.168.") || ip.startsWith("10.") ||
            ip.matches("^172\\.(1[6-9]|2\\d|3[01])\\..*");
    }

    private static boolean isValidMac(String mac) {
        return mac.matches("^([0-9A-F]{2}:){5}[0-9A-F]{2}$");
    }

    private static String safeTrim(String s) {
        return s == null ? "" : s.trim();
    }

    private static int parseIntOr(String s, int fallback) {
        if (s == null || s.trim().isEmpty()) return fallback;
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static int clampInt(int v, int min, int max) {
        return Math.max(min, Math.min(max, v));
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
