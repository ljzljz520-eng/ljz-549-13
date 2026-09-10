import React, { useState } from 'react';
import { ajaxRequest } from '../utils/ajax';
import Toast from './Toast';
import { Search, Clock, AlertTriangle, WifiOff, PackageOpen, MapPin, Calendar, RefreshCw, Hourglass } from 'lucide-react';

const API_URL = 'http://localhost:8080/api/lost-items';

/** 值班室信息（超时/失败时引导用户线下咨询） */
const DUTY_ROOM_INFO = '值班室：校园服务中心 101 室（工作日 8:00 - 17:00）';

/**
 * 失物查询页面
 * - 超过设定时间未响应则主动取消请求，提示用户稍后重试或去值班室咨询
 * - 无论成功/失败/超时，加载状态都会复位，可再次点击查询
 * - 支持 delay 参数让后端模拟慢响应，便于联调超时逻辑
 */
function LostItemQuery() {
    const [keyword, setKeyword] = useState('');
    const [timeout, setTimeoutVal] = useState(3000);   // 超时时间（ms）
    const [delay, setDelay] = useState(800);           // 让后端模拟的响应延迟（ms），联调用
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);        // 查询成功的数据
    const [errorInfo, setErrorInfo] = useState(null);  // { type, title, message }
    const [toast, setToast] = useState({ message: '', type: 'info' });

    const showToast = (message, type = 'info') => setToast({ message, type });
    const clearToast = () => setToast({ message: '', type: 'info' });

    const handleQuery = () => {
        const kw = keyword.trim();

        setLoading(true);
        setResult(null);
        setErrorInfo(null);

        // 组装查询参数：keyword 为业务参数，delay 仅用于联调模拟慢响应
        const params = new URLSearchParams();
        if (kw) params.append('keyword', kw);
        if (delay > 0) params.append('delay', String(delay));
        const url = `${API_URL}?${params.toString()}`;

        ajaxRequest({
            url,
            method: 'GET',
            timeout,
            onLoading: setLoading,
            onSuccess: (res) => {
                setResult(res.data);
                showToast(`查询成功，共 ${res.data.count} 条记录`, 'success');
            },
            onError: (err) => {
                // 根据错误类型给出针对性提示，并引导用户去值班室咨询
                if (err.type === 'timeout') {
                    setErrorInfo({
                        type: 'timeout',
                        title: '查询超时',
                        message: `服务器超过 ${timeout}ms 未响应，已取消本次查询。请稍后重试，或前往值班室咨询。`
                    });
                    showToast('查询超时，请稍后重试', 'warning');
                } else if (err.type === 'network') {
                    setErrorInfo({
                        type: 'network',
                        title: '网络连接异常',
                        message: '当前网络不可用，请检查网络连接后重试，或前往值班室咨询。'
                    });
                    showToast('网络连接异常', 'error');
                } else {
                    setErrorInfo({
                        type: 'http',
                        title: `查询失败 (${err.code || '未知'})`,
                        message: `${err.message || '服务器处理出错'}，请稍后重试，或前往值班室咨询。`
                    });
                    showToast(`查询失败: ${err.message}`, 'error');
                }
            }
        });
    };

    const handleRetry = () => {
        // 网络恢复或稍后再试：直接以上次条件重新发起查询
        handleQuery();
    };

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <Toast message={toast.message} type={toast.type} onClose={clearToast} />

            <div className="max-w-2xl mx-auto flex flex-col gap-5">

                {/* 查询表单 */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-lg flex flex-col gap-4">
                    <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                        <Search className="w-4 h-4 text-blue-400" /> 失物查询
                    </h2>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleQuery(); }}
                            placeholder="请输入物品名称，如：水杯、学生证（留空查询全部）"
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none placeholder-slate-600 focus:border-blue-500"
                        />
                        <button
                            onClick={handleQuery}
                            disabled={loading}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[104px] justify-center"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    查询中
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4" /> 查询
                                </>
                            )}
                        </button>
                    </div>

                    {/* 超时与联调参数 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2">
                            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                            <span className="text-xs text-slate-400 whitespace-nowrap">超时时间 (ms):</span>
                            <input
                                type="number"
                                min="100"
                                step="100"
                                value={timeout}
                                onChange={(e) => setTimeoutVal(Number(e.target.value))}
                                className="bg-transparent w-full text-sm font-mono outline-none text-white text-center border-b border-slate-800 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2">
                            <Hourglass className="w-4 h-4 text-slate-500 shrink-0" />
                            <span className="text-xs text-slate-400 whitespace-nowrap">模拟延迟 (ms):</span>
                            <input
                                type="number"
                                min="0"
                                step="100"
                                value={delay}
                                onChange={(e) => setDelay(Number(e.target.value))}
                                className="bg-transparent w-full text-sm font-mono outline-none text-white text-center border-b border-slate-800 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <p className="text-xs text-slate-600">
                        💡 联调提示：将「模拟延迟」设为大于「超时时间」的值（如 5000 &gt; 3000），即可验证超时处理逻辑。
                    </p>
                </div>

                {/* 加载中 */}
                {loading && (
                    <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        <span className="text-blue-400 text-sm font-mono animate-pulse">
                            正在查询失物信息...（{timeout}ms 内未响应将自动取消）
                        </span>
                    </div>
                )}

                {/* 超时 / 失败提示：可重试 + 值班室引导 */}
                {!loading && errorInfo && (
                    <div className="bg-slate-900 rounded-xl border border-yellow-900/60 overflow-hidden">
                        <div className="p-5 flex flex-col items-center gap-3 text-center">
                            {errorInfo.type === 'network' ? (
                                <WifiOff className="w-10 h-10 text-yellow-500" />
                            ) : (
                                <AlertTriangle className="w-10 h-10 text-yellow-500" />
                            )}
                            <div>
                                <h3 className="text-yellow-400 font-bold">{errorInfo.title}</h3>
                                <p className="text-slate-400 text-sm mt-1">{errorInfo.message}</p>
                            </div>
                            <button
                                onClick={handleRetry}
                                className="mt-1 px-5 py-2 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 text-sm font-bold rounded-lg border border-yellow-700/50 flex items-center gap-2 transition-all"
                            >
                                <RefreshCw className="w-4 h-4" /> 重新查询
                            </button>
                        </div>
                        <div className="bg-yellow-900/10 border-t border-yellow-900/40 px-5 py-3 text-xs text-yellow-200/80 text-center">
                            📍 {DUTY_ROOM_INFO}
                        </div>
                    </div>
                )}

                {/* 查询结果 */}
                {!loading && result && (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-800 flex justify-between items-center">
                            <span className="text-sm text-slate-300">
                                查询结果
                                {result.keyword && <span className="text-slate-500">（关键词：{result.keyword}）</span>}
                            </span>
                            <span className="text-xs font-mono text-slate-500">共 {result.count} 条</span>
                        </div>

                        {result.items && result.items.length > 0 ? (
                            <ul className="divide-y divide-slate-800">
                                {result.items.map((item) => (
                                    <li key={item.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-800/40 transition-colors">
                                        <PackageOpen className="w-8 h-8 text-blue-400/70 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-200">{item.name}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === '待认领'
                                                        ? 'bg-green-900/40 text-green-400 border border-green-800/50'
                                                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> 拾到地点：{item.location}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> 登记日期：{item.date}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                <PackageOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>未找到相关失物登记信息。</p>
                                <p className="mt-1 text-xs text-slate-600">如确认物品已丢失，可前往值班室登记寻物。{DUTY_ROOM_INFO}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 初始提示 */}
                {!loading && !result && !errorInfo && (
                    <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-800/50 text-center text-slate-600 text-sm">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        输入物品名称后点击「查询」，或留空查询全部失物登记记录。
                    </div>
                )}
            </div>
        </div>
    );
}

export default LostItemQuery;
