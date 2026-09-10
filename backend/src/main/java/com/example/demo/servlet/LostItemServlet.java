package com.example.demo.servlet;

import com.google.gson.Gson;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 失物查询接口。
 *
 * GET /api/lost-items?keyword=水杯&delay=5000
 *
 * 参数说明：
 *   keyword - 物品名称关键词（可选，为空返回全部）
 *   delay   - 模拟慢响应的毫秒数（可选，默认 800ms，上限 30000ms），联调超时处理用
 */
@WebServlet("/api/lost-items")
public class LostItemServlet extends HttpServlet {

    /** 默认模拟延迟（ms） */
    private static final long DEFAULT_DELAY_MS = 800;
    /** 延迟上限，防止联调时误传超大值把线程挂死 */
    private static final long MAX_DELAY_MS = 30000;

    private final Gson gson = new Gson();

    /** 模拟失物招领数据（真实项目中应来自数据库） */
    private static final String[][] MOCK_ITEMS = {
        {"1", "学生证",   "图书馆二楼阅览室", "2026-09-05", "待认领"},
        {"2", "蓝色水杯", "一食堂一楼餐桌",   "2026-09-06", "待认领"},
        {"3", "黑色雨伞", "教学楼A区103教室", "2026-09-07", "待认领"},
        {"4", "钥匙串",   "操场看台",         "2026-09-08", "待认领"},
        {"5", "蓝牙耳机", "体育馆更衣室",     "2026-09-08", "已认领"},
        {"6", "校园卡",   "校医院挂号处",     "2026-09-09", "待认领"},
        {"7", "高数课本", "教学楼B区201教室", "2026-09-09", "待认领"}
    };

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        // 1. 模拟慢响应：?delay=毫秒数，便于前端联调超时处理
        long delay = parseDelay(req.getParameter("delay"));
        if (delay > 0) {
            try {
                Thread.sleep(delay);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        String keyword = req.getParameter("keyword");
        if (keyword == null) {
            keyword = "";
        }
        keyword = keyword.trim();

        // 2. 模拟异常场景：keyword=server_error 时返回 500，便于联调错误处理
        if ("server_error".equals(keyword)) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            Map<String, Object> err = new HashMap<>();
            err.put("error", "模拟的失物查询服务异常");
            err.put("code", 500);
            resp.getWriter().write(gson.toJson(err));
            return;
        }

        // 3. 按关键词过滤失物列表
        List<Map<String, Object>> items = new ArrayList<>();
        for (String[] row : MOCK_ITEMS) {
            String name = row[1];
            if (!keyword.isEmpty() && !name.contains(keyword)) {
                continue;
            }
            Map<String, Object> item = new HashMap<>();
            item.put("id", row[0]);
            item.put("name", row[1]);
            item.put("location", row[2]);
            item.put("date", row[3]);
            item.put("status", row[4]);
            items.add(item);
        }

        // 4. 返回查询结果
        Map<String, Object> result = new HashMap<>();
        result.put("code", 0);
        result.put("keyword", keyword);
        result.put("count", items.size());
        result.put("items", items);
        result.put("simulatedDelayMs", delay);
        result.put("timestamp", System.currentTimeMillis());

        resp.setStatus(HttpServletResponse.SC_OK);
        resp.getWriter().write(gson.toJson(result));
    }

    /** 解析 delay 参数：非法值回退默认值，并限制在 [0, MAX_DELAY_MS] */
    private long parseDelay(String delayParam) {
        if (delayParam == null || delayParam.trim().isEmpty()) {
            return DEFAULT_DELAY_MS;
        }
        try {
            long delay = Long.parseLong(delayParam.trim());
            if (delay < 0) {
                return 0;
            }
            return Math.min(delay, MAX_DELAY_MS);
        } catch (NumberFormatException e) {
            return DEFAULT_DELAY_MS;
        }
    }
}
