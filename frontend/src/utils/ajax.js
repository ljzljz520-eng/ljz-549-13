/**
 * AJAX Request Utility
 * Encapsulates fetch with timeout, error handling, and loading state management.
 *
 * onError 回调收到的错误对象结构：
 *   {
 *     type: 'timeout' | 'network' | 'http',  // 错误分类，便于页面针对性提示
 *     message: string,                        // 人类可读的错误信息
 *     code: number,                           // HTTP 状态码，超时/网络错误时为 0
 *     details: object | undefined             // 服务端返回的错误体（仅 HTTP 错误时有）
 *   }
 */
export const ajaxRequest = async ({
    url,
    method = 'GET',
    headers = {},
    data = null,
    onLoading = () => { },
    onSuccess = () => { },
    onError = () => { },
    timeout = 10000 // 10s default timeout
}) => {
    onLoading(true);

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            signal: controller.signal
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(url, config);
        clearTimeout(id);

        // Parse JSON
        let result;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            result = await response.json();
        } else {
            result = await response.text();
        }

        if (!response.ok) {
            // Handle HTTP errors
            throw {
                type: 'http',
                status: response.status,
                message: result.error || result.message || 'Request failed',
                data: result
            };
        }

        // Convert headers to object
        const headersObj = {};
        response.headers.forEach((value, key) => {
            headersObj[key] = value;
        });

        onSuccess({
            data: result,
            status: response.status,
            headers: headersObj
        });
    } catch (error) {
        let type = 'http';
        let errorMsg = error.message;

        if (error.name === 'AbortError') {
            // 超时主动取消（AbortController）
            type = 'timeout';
            errorMsg = 'Request timed out';
        } else if (error instanceof TypeError) {
            // fetch 在网络断开 / 跨域失败 / 服务不可达时抛出 TypeError
            type = 'network';
            errorMsg = 'Network connection failed';
        }

        console.error('AJAX Error:', error);
        onError({
            type,
            message: errorMsg,
            code: error.status || 0,
            details: error.data
        });
    } finally {
        // 无论成功、失败还是超时，都必须复位 loading，避免加载图标一直转
        clearTimeout(id);
        onLoading(false);
    }
};
