/*
==============================================================
Improved Version of Digital Wellbeing App (page.tsx)
- Maintains all existing functionality
- Enhanced readability, performance, UI responsiveness, accessibility
- Type safety improvements
- Single-file structure preserved
==============================================================
*/

"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// Chart.jsの型定義 (TypeScript環境での型エラー回避のため、anyを使用)
// ※ 外部ライブラリの型定義がない場合の回避策です
type ChartConstructor = any;
type ChartInstance = any;
type ChartConfiguration = any;
type ChartData = any;
type ChartOptions = any;

// データ構造の型定義
// 日々の記録データ（日付、利用時間、レビュー）
interface DailyRecord {
    date: string;
    timeUsed: number;
    review: string;
}

// バッジの型定義
// ユーザーが獲得できるバッジのプロパティ
interface Badge {
    id: string;
    name: string;
    icon: string;
    category: 'Consistency' | 'Focus' | 'Insight';
    condition: string;
    isAchieved: boolean;
    progress: number;    // 達成率 (0.0 to 1.0)
    progressDetail: string; // 進捗の具体的な文字列 (例: "4日 / 7日")
}

// ⭐ ランクの型定義
// スコアに応じたユーザーランク
interface Rank {
    name: string;
    icon: string;
    threshold: number; // このスコア以上で到達
    color: string; // Tailwind CSS color for display
}

// ⭐ ランク定義
// 各ランクの閾値と表示色を設定
const RANKS: Rank[] = [
    { name: 'ブロンズ', icon: '🥉', threshold: 0, color: 'text-amber-800' },     // #b8860b
    { name: 'シルバー', icon: '🥈', threshold: 10, color: 'text-gray-500' },     // #6b7280
    { name: 'ゴールド', icon: '🥇', threshold: 30, color: 'text-yellow-600' },   // #d97706
    { name: 'プラチナ', icon: '💎', threshold: 60, color: 'text-blue-500' },     // #3b82f6
    { name: 'ダイヤ', icon: '💠', threshold: 100, color: 'text-cyan-500' },     // #06b6d4
    { name: 'マスター', icon: '👑', threshold: 150, color: 'text-purple-600' },   // #9333ea
];

// ⭐ スコア増減ルール
// ゲームフィディケーション要素：成功時と失敗時のポイント
const POINTS = {
    SUCCESS: 3, // 目標達成で加算
    FAILURE: -1, // 目標未達成で減算 (減る要素)
};

// 💬 メッセージ設定
// 目標達成時・未達成時のランダムメッセージ
const SUCCESS_MESSAGES = [
    "目標達成おめでとうございます！🎉",
    "素晴らしいセルフコントロールです！✨",
    "時間を味方につけていますね。この調子！🕰️",
    "ナイス！自分を褒めてあげてください😊",
    "良いペースです。明日も頑張りましょう！🚀"
];

const FAILURE_MESSAGES = [
    "ドンマイ！明日は意識してみましょう💪",
    "少し使いすぎてしまったかも？明日はリフレッシュ🍃",
    "気づくことが大事です。次は通知をオフにしてみましょうか🔕",
    "惜しい！次はスマホを別の部屋に置いてみましょう📱",
    "失敗は成功のもと。切り替えていきましょう🔥"
];

// 連続記録（ストリーク）時の特別メッセージ
const STREAK_SUCCESS_MESSAGES: { [key: number]: string } = {
    3: "🔥 3日連続達成！習慣が身についてきました！",
    5: "🖐️ 5日連続達成！素晴らしい集中力です！",
    10: "👑 10日連続達成！もはや達人の域です！"
};

const STREAK_FAILURE_MESSAGES: { [key: number]: string } = {
    3: "💦 3日連続オーバー。目標が高すぎるかも？見直してみましょう。",
    5: "🛑 5日連続オーバーです。少しスマホから離れる時間を作りましょう。",
    10: "🚨 10日連続... 一度「依存度診断」を受けることをお勧めします。"
};

// 依存度診断テストの質問と構造
const testQuestions = [
    "スマートフォンを使う時間を減らそうとしたが、結局できなかった。",
    "食事中や会話中など、本来スマートフォンを使うべきではない状況で、無意識に手に取ってしまう。",
    "通知が来ていないか、理由もなく頻繁にスマートフォンをチェックしてしまう。",
    "スマートフォンが手元にないときや、電波が悪いときに、不安やイライラを感じる。",
    "睡眠時間が削られたり、仕事や学業の効率が落ちるなど、生活に悪影響が出ていると感じる。",
    "スマートフォンを使っているせいで、趣味や運動、友人との交流といった他の活動を疎かにしている。",
    "疲労感や目の疲れ、手首の痛みなど、身体的な不調を感じることがある。",
    "家族や友人から、スマートフォンの使いすぎについて指摘されたことがある。",
    "ベッドに入ってからも長時間スマートフォンを見てしまい、寝つきが悪くなる。",
    "重要な用事がないのに、気がつくとスマートフォンを操作している時間が長い。",
];

// ユーティリティ関数
// 日付オブジェクトを "YYYY-MM-DD" 形式の文字列に変換
const formatDate = (date: Date): string => new Date(date).toISOString().slice(0, 10);

// テスト用データ生成
// 初期表示用のダミーデータや設定
const initialGoalTime = 300;
const addTestRecords = (): DailyRecord[] => {
    const today = new Date();
    // 必要に応じて初期データを設定
    const records: DailyRecord[] = [];
    return records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// ===============================================
// ⭐ 定義: サーバーとクライアントで一致させる初期デフォルト値
// ===============================================
const initialDailyRecords = addTestRecords();
const initialTestAnswers = new Array(testQuestions.length).fill(null);
const initialTestScore: number | null = null;
const initialTestResult: { level: string, recommendation: string } | null = null;
const initialRankScore = 0;

// ===============================================
// LocalStorageキー定義とヘルパー関数
// ===============================================

// ブラウザのLocalStorageに保存するためのキー
const KEY_GOAL = 'dw_goalTime';
const KEY_RECORDS = 'dw_dailyRecords';
const KEY_ANSWERS = 'dw_testAnswers';
const KEY_SCORE = 'dw_testTotalScore';
const KEY_RESULT = 'dw_testResult';
const KEY_RANK_SCORE = 'dw_rankScore';

// LocalStorageからデータを読み込む汎用関数（SSR対策込み）
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const storedValue = localStorage.getItem(key);
        if (storedValue === null || storedValue === 'undefined') return defaultValue;
        // 数値型データの特別処理
        if (key === KEY_GOAL || key === KEY_RANK_SCORE) {
             const num = parseInt(storedValue);
             return (isNaN(num) || num < 0 ? defaultValue : num) as T;
        }
        return JSON.parse(storedValue) as T;
    } catch (error) {
        console.error(`Error loading key ${key} from localStorage:`, error);
        return defaultValue;
    }
};

// LocalStorageへデータを保存する関数
const saveToLocalStorage = (key: string, value: any) => {
    if (typeof window === 'undefined') return;
    try {
        const valueToStore = (typeof value === 'object' && value !== null) || Array.isArray(value) 
            ? JSON.stringify(value)
            : String(value);
        localStorage.setItem(key, valueToStore);
    } catch (error) {
        console.error(`Error saving key ${key} to localStorage:`, error);
    }
};

// ===============================================
// 2. モーダルコンポーネント定義
// ===============================================

// ------------------------------------------
// Chartコンポーネント
// ------------------------------------------
// Chart.jsを使用して利用時間のグラフを描画するコンポーネント
const ChartComponent = React.memo(({ chartjsConstructor, dailyRecords, goalTime, chartRef, chartInstance, isChartJsLoaded, filterType }: 
    { 
        chartjsConstructor: ChartConstructor | null, 
        dailyRecords: DailyRecord[], 
        goalTime: number,
        chartRef: React.RefObject<HTMLCanvasElement | null>,
        chartInstance: React.MutableRefObject<ChartInstance | null>,
        isChartJsLoaded: boolean,
        filterType: '7days' | '30days'
    }) => {

    // グラフデータの生成（メモ化により再計算を抑制）
    const chartData = useMemo(() => {
        const sortedRecords = [...dailyRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // フィルタリングロジック: 直近7日 or 直近30日
        const daysToShow = filterType === '7days' ? 7 : 30;
        const displayRecords = sortedRecords.slice(-daysToShow); 

        const days = ['日', '月', '火', '水', '木', '金', '土'];
        const dates = displayRecords.map(r => {
            const dateObj = new Date(r.date);
            const month = dateObj.getMonth() + 1;
            const day = dateObj.getDate();
            const dayOfWeek = days[dateObj.getDay()];
            return `${month}/${day}(${dayOfWeek})`;
        });

        const timesUsed = displayRecords.map(r => r.timeUsed);
        const goalData = displayRecords.map(() => goalTime);

        // Chart.js用のデータ構造
        const data: ChartData = {
            labels: dates,
            datasets: [
                {
                    label: '実績利用時間 (分)',
                    data: timesUsed,
                    // 目標超過時は赤色、達成時は青色
                    backgroundColor: timesUsed.map(time => time > goalTime ? '#ef4444' : '#4f46e5'), 
                    borderRadius: 4,
                },
                {
                    label: '目標時間 (分)',
                    data: goalData,
                    type: 'line',
                    borderColor: '#f97316',
                    borderWidth: 2,
                    pointRadius: filterType === '30days' ? 2 : 4, 
                    pointBackgroundColor: '#f97316',
                }
            ],
        };

        const options: ChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' as const },
                title: { 
                    display: true, 
                    text: `直近${daysToShow}日間の利用時間`, 
                    font: { size: 16 } 
                },
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: '利用時間 (分)' } },
                x: { 
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: filterType === '30days' ? 15 : 7 
                    }
                }
            }
        };

        return { data, options };
    }, [dailyRecords, goalTime, filterType]);

    // グラフの描画・更新処理
    useEffect(() => {
        if (chartjsConstructor && chartRef.current && isChartJsLoaded) {
            if (chartInstance.current) {
                chartInstance.current.destroy(); // 既存のグラフを破棄して再描画
            }
            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                chartInstance.current = new chartjsConstructor(ctx, {
                    type: 'bar',
                    data: chartData.data,
                    options: chartData.options,
                } as ChartConfiguration);
            }
        }
        return () => {
            // アンマウント時のクリーンアップ
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [chartData, chartjsConstructor, chartRef, chartInstance, isChartJsLoaded]);

    if (!isChartJsLoaded) {
        return <div className="text-center text-gray-500 py-10">グラフ描画ライブラリをロード中です...</div>;
    }

    return (
        <div className="relative h-96">
            <canvas ref={chartRef}></canvas>
        </div>
    );
});
ChartComponent.displayName = 'ChartComponent';

// ------------------------------------------
// 依存度診断テストモーダル
// ------------------------------------------
// 依存度チェックテストのUIと結果表示を行うモーダル
const AddictionTestModal = React.memo(({ 
    isOpen, setIsModalOpen, testQuestions, testAnswers, handleAnswerChange, 
    calculateScore, resetTest, testResult, testTotalScore, handleOptionClick
}: {
    isOpen: boolean;
    setIsModalOpen: (isOpen: boolean) => void;
    testQuestions: string[];
    testAnswers: number[];
    handleAnswerChange: (questionIndex: number, score: number) => void;
    calculateScore: () => void;
    resetTest: () => void;
    testResult: { level: string, recommendation: string } | null;
    testTotalScore: number | null;
    handleOptionClick: (e: React.MouseEvent) => void;
}) => {
    if (!isOpen) return null;

    const answeredCount = testAnswers.filter(s => s !== null && s !== undefined).length;
    const totalQuestions = testQuestions.length;
    const isAllAnswered = answeredCount === totalQuestions;

    const options = [
        { label: "全くない (0点)", score: 0, class: "border-green-400 bg-green-50 text-green-700 hover:bg-green-100" },
        { label: "たまにある (1点)", score: 1, class: "border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100" },
        { label: "よくある (2点)", score: 2, class: "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100" },
        { label: "ほとんどいつも (3点)", score: 3, class: "border-red-400 bg-red-50 text-red-700 hover:bg-red-100" },
    ];

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl p-6 md:p-8 relative overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h3 className="font-extrabold text-indigo-700 text-3xl mb-4 border-b pb-2 flex items-center"><span className="text-4xl mr-2">📱</span> スマートフォン依存度 診断テスト</h3>
                <p className="text-gray-600 mb-6">以下の質問について、過去数週間を振り返り、ご自身の状況に最も近いものを選択してください。（全10問）</p>
                {testResult ? (
                    // 診断結果表示ビュー
                    <div className="mt-8 p-6 bg-red-50 border-2 border-red-300 rounded-xl shadow-inner">
                        <h4 className="text-2xl font-extrabold text-red-700 mb-4 flex items-center"><span className="text-3xl mr-2">🚨</span> 診断結果</h4>
                        <p className="text-xl font-bold mb-2">判定レベル: <span className="text-red-800 text-3xl">{testResult.level}</span></p>
                        <p className="text-lg font-bold mb-4">合計スコア: <span className="text-red-800 text-2xl">{testTotalScore}点</span></p>
                        <div className="border-t pt-4">
                            <h5 className="font-bold text-red-700 mb-2">おすすめの行動指針:</h5>
                            <p className="text-gray-700 whitespace-pre-line">{testResult.recommendation}</p>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button onClick={resetTest} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">再診断する</button>
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">閉じる</button>
                        </div>
                    </div>
                ) : (
                    // 質問回答ビュー
                    <div className="space-y-6">
                        {testQuestions.map((question, index) => (
                            <div key={index} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                                <p className="font-bold text-gray-800 mb-3">Q{index + 1}. {question}</p>
                                <div className="flex flex-wrap gap-3">
                                    {options.map((option) => (
                                        <label key={option.score} className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition duration-150 ease-in-out text-sm font-semibold ${option.class} ${testAnswers[index] === option.score ? 'ring-4 ring-offset-2' : ''}`} onClick={handleOptionClick}>
                                            <input type="radio" name={`question-${index}`} value={option.score} checked={testAnswers[index] === option.score} onChange={() => handleAnswerChange(index, option.score)} className="sr-only" />
                                            <span className="ml-0 text-center">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-end space-x-3 pt-4">
                            <button onClick={calculateScore} disabled={!isAllAnswered} className={`px-8 py-3 font-bold rounded-lg transition transform hover:scale-[1.01] shadow-lg ${isAllAnswered ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                                診断する ({answeredCount} / {totalQuestions}問回答済み)
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
AddictionTestModal.displayName = 'AddictionTestModal';

// ------------------------------------------
// レビュー編集モーダル（削除ボタンあり）
// ------------------------------------------
// 過去の記録のレビュー編集や削除を行うモーダル
const ReviewEditModal = React.memo(({
    isOpen, onClose, editingRecord, editReviewText, setEditReviewText, handleUpdateReview, handleDeleteRecord, goalTime
}: {
    isOpen: boolean; onClose: () => void; editingRecord: DailyRecord | null; editReviewText: string; setEditReviewText: (text: string) => void; handleUpdateReview: () => void; handleDeleteRecord: () => void; goalTime: number;
}) => {
    if (!isOpen || !editingRecord) return null;
    const isAchieved = editingRecord.timeUsed <= goalTime;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 md:p-8 relative overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                <h3 className="font-extrabold text-indigo-700 text-2xl mb-4 border-b pb-2">レビューの確認・編集</h3>
                <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                    <p className="text-sm font-bold text-gray-700 mb-2">{editingRecord.date} の記録</p>
                    <p className="text-xl font-bold mb-2">利用時間: <span className={isAchieved ? 'text-green-600' : 'text-red-600'}>{editingRecord.timeUsed}分</span> (目標: {goalTime}分)</p>
                    <p className={`text-sm font-semibold ${isAchieved ? 'text-green-600' : 'text-red-600'}`}>{isAchieved ? '✅ 目標達成' : '❌ 目標未達成'}</p>
                </div>
                <div className="mb-4">
                    <label htmlFor="editReviewTextarea" className="block text-sm font-bold text-indigo-700 mb-1">レビュー (反省・気づき)</label>
                    <textarea id="editReviewTextarea" placeholder="例: 目標達成できた。明日もこの習慣を続ける。" rows={4} value={editReviewText} onChange={(e) => setEditReviewText(e.target.value)} className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm" />
                </div>
                <div className="flex justify-between items-center space-x-3 mt-6">
                    <button onClick={handleDeleteRecord} className="flex-shrink-0 px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg transition hover:bg-red-200 border border-red-300 text-sm">記録を削除</button>
                    <button onClick={handleUpdateReview} disabled={editReviewText.trim() === ''} className={`flex-grow px-4 py-3 font-bold rounded-lg transition transform hover:scale-[1.01] shadow-lg ${editReviewText.trim() === '' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>レビューを保存</button>
                </div>
            </div>
        </div>
    );
});
ReviewEditModal.displayName = 'ReviewEditModal';

// 💬 Feedback Modal
// 記録保存時にフィードバックを表示するモーダル
const FeedbackModal = React.memo(({ isOpen, onClose, data }: { isOpen: boolean; onClose: () => void; data: { isSuccess: boolean; message: string; timeUsed: number; goalTime: number } | null }) => {
    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 relative text-center transform transition-all scale-100 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <div className="mb-6">
                    <span className="text-6xl">{data.isSuccess ? '🎉' : '💪'}</span>
                </div>
                <h3 className={`text-2xl font-extrabold mb-2 ${data.isSuccess ? 'text-green-600' : 'text-orange-600'}`}>
                    {data.isSuccess ? 'GOAL ACHIEVED!' : 'NEXT TIME!'}
                </h3>
                <p className="text-gray-500 font-bold mb-6">
                    実績: {data.timeUsed}分 <span className="text-xs text-gray-400">/ 目標: {data.goalTime}分</span>
                </p>
                <div className={`p-4 rounded-xl mb-8 border-l-4 text-left ${data.isSuccess ? 'bg-green-50 border-green-400 text-green-800' : 'bg-orange-50 border-orange-400 text-orange-800'}`}>
                    <p className="font-bold text-lg leading-relaxed whitespace-pre-line">
                        {data.message}
                    </p>
                </div>
                <button onClick={onClose} className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition transform hover:scale-[1.02] ${data.isSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                    閉じる
                </button>
            </div>
        </div>
    );
});
FeedbackModal.displayName = 'FeedbackModal';

// ------------------------------------------
// ランク詳細モーダル
// ------------------------------------------
// 現在のランクと次のランクへの進捗を表示するモーダル
const RankDetailModal = React.memo(({ isOpen, onClose, currentRank, currentScore, allRanks }: { isOpen: boolean; onClose: () => void; currentRank: Rank; currentScore: number; allRanks: Rank[]; }) => {
    if (!isOpen) return null;

    const currentIndex = allRanks.findIndex(r => r.name === currentRank.name);
    const nextRank = currentIndex < allRanks.length - 1 ? allRanks[currentIndex + 1] : null;
    let requiredScore = nextRank ? nextRank.threshold - currentScore : 0;
    const currentRankColorClass = currentRank.color.replace('text', 'bg').replace('-800', '-600').replace('-700', '-500').replace('-600', '-500');
    const maxThreshold = allRanks[allRanks.length - 1].threshold + 50; 
    const currentScorePercentage = Math.min(100, (currentScore / maxThreshold) * 100);

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl p-6 md:p-8 relative overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                <h3 className="font-extrabold text-indigo-700 text-3xl mb-4 border-b pb-2 flex items-center"><span className="text-4xl mr-2">🏆</span> ランク詳細とスコア目標</h3>
                <div className="bg-indigo-50 p-4 rounded-xl shadow-md border border-indigo-200 text-center mb-6">
                    <p className="text-sm font-semibold text-gray-600">現在のランク</p>
                    <p className={`text-5xl font-black ${currentRank.color} flex items-center justify-center`}><span className="text-6xl mr-3">{currentRank.icon}</span> {currentRank.name}</p>
                    <p className="text-xl font-bold text-indigo-700 mt-2">スコア: {currentScore} P</p>
                </div>
                {/* プログレスバー表示 */}
                <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-visible shadow-inner mb-24 mt-16"> 
                    <div className={`h-full rounded-full ${currentRankColorClass} transition-all duration-500 ease-out`} style={{ width: `${currentScorePercentage}%` }}></div>
                    {allRanks.map((rank) => {
                        if (rank.threshold === 0) return null; 
                        const positionPercentage = (rank.threshold / maxThreshold) * 100;
                        if (positionPercentage > 100) return null;
                        const isCurrentOrPassed = currentScore >= rank.threshold;
                        const markerColor = isCurrentOrPassed ? rank.color.replace('text', 'bg') : 'bg-gray-400';
                        return (
                            <div key={rank.name} className="absolute top-0 transform -translate-x-1/2 text-center" style={{ left: `${positionPercentage}%` }}>
                                <div className="relative">
                                    <span className={`text-3xl transition duration-300 absolute top-[-50px] left-1/2 transform -translate-x-1/2 ${rank.color} ${isCurrentOrPassed ? 'opacity-100 scale-100' : 'opacity-50 scale-90'}`}>{rank.icon}</span>
                                    <div className={`absolute left-1/2 top-0 transform -translate-x-1/2 w-1 h-8 ${markerColor}`}></div>
                                    <p className="absolute bottom-[-30px] left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700 whitespace-nowrap">{rank.threshold} P</p>
                                </div>
                            </div>
                        );
                    })}
                    {currentScore > 0 && currentScorePercentage < 100 && (
                        <div className="absolute top-[50px] transform -translate-x-1/2 text-center z-20" style={{ left: `${currentScorePercentage}%` }}>
                            <div className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap mt-4">現在地</div>
                            <div className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-indigo-600 mt-0"></div>
                        </div>
                    )}
                </div>
                <div className="mt-8">
                    <h4 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">ランク昇格条件一覧</h4>
                    {allRanks.map((rank, index) => {
                        const isCurrent = rank.name === currentRank.name;
                        return (
                            <div key={index} className={`flex justify-between items-center p-4 rounded-xl mb-3 transition shadow-sm ${isCurrent ? 'bg-indigo-100 border-2 border-indigo-400' : 'bg-white border border-gray-200'}`}>
                                <div className="flex items-center space-x-3"><span className={`text-3xl ${rank.color}`}>{rank.icon}</span><p className={`font-bold text-lg ${isCurrent ? 'text-indigo-800' : 'text-gray-700'}`}>{rank.name} ランク {isCurrent && '(現在)'}</p></div>
                                <p className="text-xl font-bold text-gray-700">{rank.threshold} P</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});
RankDetailModal.displayName = 'RankDetailModal';

// ------------------------------------------
// スピナー非表示CSSコンポーネント
// ------------------------------------------
// input[type=number]のブラウザデフォルトのスピナーを非表示にする
const NoSpinnerStyles = () => (
    <style jsx global>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
    `}</style>
);

// ===============================================
// Main Component
// ===============================================

const DigitalWellbeingApp: React.FC = () => {
    // State Initialization
    // アプリケーションの状態管理
    const [goalTime, setGoalTimeState] = useState<number>(initialGoalTime);
    const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>(initialDailyRecords); 
    const [activeTab, setActiveTab] = useState('data-entry');
    const [newRecord, setNewRecord] = useState({ date: formatDate(new Date()), timeUsed: '300', review: '' });
    const [toastMessage, setToastMessage] = useState('');
    
    // New State for Monthly Filter
    // グラフや履歴のフィルター用状態
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
    const [historyFilter, setHistoryFilter] = useState<'7days' | '30days' | 'all'>('7days');
    const [chartFilter, setChartFilter] = useState<'7days' | '30days'>('7days');

    // Addiction Test State
    // 依存度診断テスト用の状態
    const [testAnswers, setTestAnswers] = useState<number[]>(initialTestAnswers);
    const [testTotalScore, setTestTotalScore] = useState<number | null>(initialTestScore);
    const [testResult, setTestResult] = useState<{ level: string, recommendation: string } | null>(initialTestResult);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Review Edit State
    // レビュー編集モーダル用の状態
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<DailyRecord | null>(null);
    const [editReviewText, setEditReviewText] = useState('');
    
    // Rank/Score State
    // ランクとスコアの状態
    const [rankScore, setRankScore] = useState<number>(initialRankScore);
    const [isRankModalOpen, setIsRankModalOpen] = useState(false);

    // Feedback
    // フィードバックモーダル用の状態
    const [feedbackData, setFeedbackData] = useState<{ isSuccess: boolean; message: string; timeUsed: number; goalTime: number } | null>(null);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    
    // Chart.js Refs
    // Chart.jsのインスタンスとキャンバスへの参照
    const [isChartJsLoaded, setIsChartJsLoaded] = useState(false);
    const chartjsConstructorRef = useRef<ChartConstructor | null>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<ChartInstance | null>(null);
    const goalTimeInputRef = useRef<HTMLInputElement>(null);

    // Load Data from LocalStorage
    // マウント時にLocalStorageからデータを復元
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setGoalTimeState(loadFromLocalStorage(KEY_GOAL, initialGoalTime));
            setDailyRecords(loadFromLocalStorage(KEY_RECORDS, initialDailyRecords));
            setTestAnswers(loadFromLocalStorage(KEY_ANSWERS, initialTestAnswers));
            setTestTotalScore(loadFromLocalStorage(KEY_SCORE, initialTestScore));
            setTestResult(loadFromLocalStorage(KEY_RESULT, initialTestResult));
            setRankScore(loadFromLocalStorage(KEY_RANK_SCORE, initialRankScore));
        }
    }, []);

    // ▼▼▼ ここに追加してください ▼▼▼
    // 目標時間が変更されたら、入力フォームのデフォルト値も更新
    useEffect(() => {
        setNewRecord(prev => ({ ...prev, timeUsed: String(goalTime) }));
    }, [goalTime]);
    // ▲▲▲ 追加ここまで ▲▲▲

    // Save to LocalStorage on Change
    // 状態が変化するたびにLocalStorageへ保存
    useEffect(() => { saveToLocalStorage(KEY_GOAL, goalTime); }, [goalTime]);
    useEffect(() => { saveToLocalStorage(KEY_RECORDS, dailyRecords); }, [dailyRecords]);
    useEffect(() => { saveToLocalStorage(KEY_ANSWERS, testAnswers); }, [testAnswers]);
    useEffect(() => { saveToLocalStorage(KEY_SCORE, testTotalScore); }, [testTotalScore]);
    useEffect(() => { saveToLocalStorage(KEY_RESULT, testResult); }, [testResult]);
    useEffect(() => { saveToLocalStorage(KEY_RANK_SCORE, rankScore); }, [rankScore]);

    // Scroll to top on tab change
    // タブ切り替え時にページトップへスクロール
    useEffect(() => {
        if (typeof window !== 'undefined') window.scrollTo(0, 0);
    }, [activeTab]);

    // Load Chart.js
    // CDNからChart.jsを動的に読み込む
    useEffect(() => {
        if (isChartJsLoaded) return;
        const cdnUrl = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
        const script = document.createElement('script');
        script.src = cdnUrl;
        script.async = true;
        script.onload = () => {
            // @ts-ignore
            if (window.Chart) {
                // @ts-ignore
                chartjsConstructorRef.current = window.Chart;
                setIsChartJsLoaded(true);
            }
        };
        document.head.appendChild(script);
        return () => { document.head.removeChild(script); };
    }, [isChartJsLoaded]);

    // Handlers
    // トーストメッセージ表示処理
    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(''), 3000);
    };

    // ランクスコア更新処理
    const updateRankScore = (points: number) => {
        setRankScore(prev => Math.max(0, prev + points));
    };

    // ランクスコアリセット処理
    const resetRankScore = () => {
        if (window.confirm('現在のランクとスコアが0にリセットされます。\nこの操作は取り消せません。本当によろしいですか？')) {
            setRankScore(0);
            showToast('ランクとスコアをリセットしました。');
        }
    };

    // 記録全削除処理
    const resetDailyRecords = () => {
        if (window.confirm('これまでの日々の記録がすべて削除されます。\nこの操作は取り消せません。本当によろしいですか？')) {
            setDailyRecords([]);
            showToast('すべての記録データを削除しました。');
        }
    };

    // 目標時間設定処理
    const setGoalTimeHandler = () => {
        const inputGoalValue = goalTimeInputRef.current?.value;
        if (!inputGoalValue) return showToast('目標時間を入力してください。');
        const newGoal = parseInt(inputGoalValue);
        if (newGoal > 0) {
            setGoalTimeState(newGoal);
            showToast(`目標利用時間を ${newGoal} 分に更新しました。`);
        } else {
            showToast('目標時間は1分以上で設定してください。');
        }
    };

    // 日々の記録追加処理
    const addDailyRecord = () => {
        const { date, timeUsed, review } = newRecord;
        const time = parseInt(timeUsed as any);
        if (!date || isNaN(time) || time < 0) return showToast('日付と正しい利用時間を入力してください。');
        
        const isSuccess = time <= goalTime;

        setDailyRecords(prevRecords => {
            let newRecords = [...prevRecords];
            const existingIndex = prevRecords.findIndex(record => record.date === date);

            // 既存の日付なら更新、新規なら追加
            if (existingIndex !== -1) {
                newRecords[existingIndex] = { ...newRecords[existingIndex], timeUsed: time, review: review };
            } else {
                newRecords.push({ date, timeUsed: time, review });
            }
            newRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // ▼▼▼ ストリーク計算とメッセージ選択ロジック ▼▼▼
            // 連続達成記録の計算と、それに基づくフィードバックメッセージの決定
            let streak = 0;
            const targetDateObj = new Date(date);
            const pastRecords = newRecords.filter(r => new Date(r.date) <= targetDateObj).reverse();

            if (pastRecords.length > 0) {
                const currentStatusIsSuccess = pastRecords[0].timeUsed <= goalTime;
                
                for (let i = 0; i < pastRecords.length; i++) {
                    const rec = pastRecords[i];
                    const recIsSuccess = rec.timeUsed <= goalTime;
                    if (recIsSuccess !== currentStatusIsSuccess) break;
                    streak++;
                }

                let message = "";
                if (currentStatusIsSuccess) {
                    if (STREAK_SUCCESS_MESSAGES[streak]) message = STREAK_SUCCESS_MESSAGES[streak];
                    else message = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
                    
                    if (existingIndex === -1) updateRankScore(POINTS.SUCCESS);
                } else {
                    if (STREAK_FAILURE_MESSAGES[streak]) message = STREAK_FAILURE_MESSAGES[streak];
                    else message = FAILURE_MESSAGES[Math.floor(Math.random() * FAILURE_MESSAGES.length)];
                    
                    if (existingIndex === -1) updateRankScore(POINTS.FAILURE);
                }

                setFeedbackData({ isSuccess: currentStatusIsSuccess, message, timeUsed: time, goalTime });
                setIsFeedbackOpen(true);
            }
            // ▲▲▲ ここまで ▲▲▲

            return newRecords;
        });
        setNewRecord({ date: formatDate(new Date()), timeUsed: '300', review: '' });
    };

    // レビュー更新処理
    const handleUpdateReview = () => {
        if (!editingRecord) return;
        setDailyRecords(prev => prev.map(r => r.date === editingRecord.date ? { ...r, review: editReviewText } : r));
        closeReviewModal();
        showToast('レビューを更新しました。');
    };

    // 記録個別削除処理
    const handleDeleteRecord = () => {
        if (!editingRecord) return;
        if (!window.confirm('本当にこの記録を削除しますか？')) return;
        setDailyRecords(prev => prev.filter(r => r.date !== editingRecord.date));
        closeReviewModal();
        showToast(`${editingRecord.date} の利用記録を削除しました。`);
    };

    // レビューモーダルの開閉
    const openReviewModal = (record: DailyRecord) => {
        setEditingRecord(record);
        setEditReviewText(record.review);
        setIsReviewModalOpen(true);
    };
    const closeReviewModal = () => { setIsReviewModalOpen(false); setEditingRecord(null); setEditReviewText(''); };

    // 診断テストの回答操作
    const handleAnswerChange = (qIndex: number, score: number) => {
        setTestAnswers(prev => { const n = [...prev]; n[qIndex] = score; return n; });
    };
    const handleOptionClick = (e: React.MouseEvent) => e.stopPropagation();

    // 診断スコア計算
    const calculateScore = () => {
        const total = testAnswers.reduce((sum, s) => sum + (s ?? 0), 0);
        setTestTotalScore(total);
        let level = "重度依存";
        let rec = "スマートフォンが生活を支配している可能性があります。専門家への相談も検討してください。";
        
        if (total <= 6) { level = "低依存"; rec = "健康的な利用習慣が保たれています。"; }
        else if (total <= 14) { level = "軽度依存"; rec = "意識的にデジタルデトックスの時間を設けましょう。"; }
        else if (total <= 23) { level = "中度依存"; rec = "具体的な対策を直ちに実行することが必要です。"; }
        
        setTestResult({ level, recommendation: rec });
    };
    const resetTest = () => {
        setTestAnswers(new Array(testQuestions.length).fill(null));
        setTestTotalScore(null);
        setTestResult(null);
    };

    // Stats & Badges
    // 統計情報の計算とバッジ獲得判定（メモ化）
    const sortedRecords = useMemo(() => [...dailyRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [dailyRecords]);
    const currentRank = useMemo(() => [...RANKS].reverse().find(r => rankScore >= r.threshold) || RANKS[0], [rankScore]);

    const badges = useMemo(() => {
        // Helper to check if two dates are consecutive
        const isConsecutive = (date1: Date, date2: Date) => {
            const diffTime = Math.abs(date2.getTime() - date1.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            return diffDays === 1;
        };

        // Calculate Streaks & Counts
        let maxStreak = 0;
        let currentStreak = 0;
        let achievedCount = 0;
        let superFocusCount = 0;
        let reviewCount = 0;
        let consecutiveReviewStreak = 0;
        let currentReviewStreak = 0;
        
        let streakTemp = 0;
        let reviewStreakTemp = 0;

        sortedRecords.forEach((rec, i) => {
            const isAchieved = rec.timeUsed <= goalTime;
            const hasReview = rec.review && rec.review.trim() !== '';
            
            if (isAchieved) {
                achievedCount++;
                if (rec.timeUsed <= goalTime / 2) superFocusCount++;
                
                if (i > 0 && isConsecutive(new Date(sortedRecords[i-1].date), new Date(rec.date))) {
                    streakTemp++;
                } else {
                    streakTemp = 1;
                }
            } else {
                streakTemp = 0;
            }
            if (streakTemp > maxStreak) maxStreak = streakTemp;
            currentStreak = streakTemp;
            
            // Review Streak
            if (hasReview) {
                reviewCount++;
                if (i > 0 && isConsecutive(new Date(sortedRecords[i-1].date), new Date(rec.date))) {
                    reviewStreakTemp++;
                } else {
                    reviewStreakTemp = 1;
                }
            } else {
                reviewStreakTemp = 0;
            }
            if (reviewStreakTemp > consecutiveReviewStreak) consecutiveReviewStreak = reviewStreakTemp;
            currentReviewStreak = reviewStreakTemp;
        });

        const last7DaysRecords = sortedRecords.slice(-7); // last 7 records
        const last7DaysAchievedCount = last7DaysRecords.filter(r => r.timeUsed <= goalTime).length;

        // バッジ定義リスト
        const allBadges: Badge[] = [
            // 🌟 継続と習慣化の星
            { 
                id: 'start_recording', 
                name: '記録の始まり', 
                icon: '🌟', 
                category: 'Consistency', 
                condition: '初めて利用時間を記録する。', 
                isAchieved: sortedRecords.length >= 1, 
                progress: sortedRecords.length >= 1 ? 1 : 0, 
                progressDetail: `${Math.min(1, sortedRecords.length)}日` 
            },
            { 
                id: '3days_streak', 
                name: '三日坊主脱出', 
                icon: '📅', 
                category: 'Consistency', 
                condition: '3日連続で記録を達成する。', 
                isAchieved: maxStreak >= 3, 
                progress: Math.min(1, currentStreak / 3), 
                progressDetail: `${Math.min(3, currentStreak)}日 / 3日` 
            },
            { 
                id: '7days_streak', 
                name: '一週間コンスタント', 
                icon: '🗓️', 
                category: 'Consistency', 
                condition: '7日連続で記録を達成する。', 
                isAchieved: maxStreak >= 7, 
                progress: Math.min(1, currentStreak / 7), 
                progressDetail: `${Math.min(7, currentStreak)}日 / 7日` 
            },
             { 
                id: '30days_total', 
                name: '集中力の基礎', 
                icon: '🏅', 
                category: 'Consistency', 
                condition: '累計30日間、目標を達成する。', 
                isAchieved: achievedCount >= 30, 
                progress: Math.min(1, achievedCount / 30), 
                progressDetail: `${Math.min(30, achievedCount)}日 / 30日` 
            },

            // 🧠 集中の星
            { 
                id: 'god_week', 
                name: '神の一週間', 
                icon: '🧠', 
                category: 'Focus', 
                condition: '直近7日間で、5日以上目標を達成する。', 
                isAchieved: last7DaysAchievedCount >= 5, 
                progress: Math.min(1, last7DaysAchievedCount / 5), 
                progressDetail: `${last7DaysAchievedCount}日 / 5日` 
            },
            { 
                id: 'perfect_week', 
                name: '全日集中', 
                icon: '💯', 
                category: 'Focus', 
                condition: '直近7日間で、7日全て目標を達成する。', 
                isAchieved: last7DaysAchievedCount >= 7, 
                progress: Math.min(1, last7DaysAchievedCount / 7), 
                progressDetail: `${last7DaysAchievedCount}日 / 7日` 
            },
            { 
                id: 'super_focus', 
                name: '超集中モード', 
                icon: '🚀', 
                category: 'Focus', 
                condition: '利用時間が目標時間の半分以下だった日を3回記録する。', 
                isAchieved: superFocusCount >= 3, 
                progress: Math.min(1, superFocusCount / 3), 
                progressDetail: `${superFocusCount}回 / 3回` 
            },

            // 📝 内省と気づきの星
            { 
                id: 'first_insight', 
                name: '内省の第一歩', 
                icon: '📝', 
                category: 'Insight', 
                condition: 'レビューを5回記入する。', 
                isAchieved: reviewCount >= 5, 
                progress: Math.min(1, reviewCount / 5), 
                progressDetail: `${reviewCount}回 / 5回` 
            },
            { 
                id: 'habit_insight', 
                name: '習慣化の定着', 
                icon: '🔄', 
                category: 'Insight', 
                condition: 'レビューを3日連続で記入する。', 
                isAchieved: consecutiveReviewStreak >= 3, 
                progress: Math.min(1, currentReviewStreak / 3), 
                progressDetail: `${Math.min(3, currentReviewStreak)}日 / 3日` 
            },
        ];
        return allBadges;
    }, [dailyRecords, goalTime, sortedRecords]);

    // サマリーレポートの生成
    const reportSummary = useMemo(() => {
        if (dailyRecords.length === 0) return <p className="text-center text-gray-500">データがありません。</p>;
        const avg = Math.round(dailyRecords.reduce((a, b) => a + b.timeUsed, 0) / dailyRecords.length);
        return (
            <div className="bg-indigo-50 p-4 rounded-lg text-indigo-900">
                <p><strong>全期間の平均利用時間:</strong> {avg}分</p>
                <p><strong>目標達成率:</strong> {Math.round((dailyRecords.filter(r => r.timeUsed <= goalTime).length / dailyRecords.length) * 100)}%</p>
            </div>
        );
    }, [dailyRecords, goalTime]);

    // Internal Components
    // バッジ一覧とランク表示コンポーネント
    const BadgesAndAchievement = () => {
        // Group badges by category
        const categories = [
            { key: 'Consistency', title: '🌟 継続と習慣化の星' },
            { key: 'Focus', title: '🧠 集中の星' },
            { key: 'Insight', title: '📝 内省と気づきの星' }
        ];

        return (
            <div className="mt-6 space-y-8">
                <div onClick={() => setIsRankModalOpen(true)} className="cursor-pointer bg-indigo-50 p-6 rounded-xl shadow-md border border-indigo-200 flex justify-center items-center space-x-6 hover:shadow-lg transition">
                    <p className={`text-5xl font-extrabold ${currentRank.color} flex items-center`}><span className="text-6xl mr-3">{currentRank.icon}</span>{currentRank.name}</p>
                    <div className="text-center border-l-2 border-indigo-200 pl-6"><p className="text-sm text-gray-600">現在のスコア</p><p className="text-3xl font-bold text-indigo-700">{rankScore} P</p></div>
                </div>

                {categories.map(cat => (
                    <div key={cat.key}>
                        <h4 className="font-bold text-gray-700 text-lg mb-3 border-l-4 border-indigo-500 pl-3">{cat.title}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {badges.filter(b => b.category === cat.key).map(badge => (
                                <div key={badge.id} className={`p-4 rounded-xl border-2 flex flex-col justify-between h-full ${badge.isAchieved ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-50 border-gray-200 grayscale'}`}>
                                    <div>
                                        <div className="text-4xl mb-2 text-center">{badge.icon}</div>
                                        <h4 className="font-bold text-center text-gray-800">{badge.name}</h4>
                                        <p className="text-xs text-center text-gray-500 mt-1 mb-2">{badge.condition}</p>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                                            <span>{badge.isAchieved ? '達成' : '未達成'}</span>
                                            <span>{badge.progressDetail}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div className={`h-2.5 rounded-full transition-all duration-500 ${badge.isAchieved ? 'bg-yellow-400' : 'bg-indigo-400'}`} style={{ width: `${badge.progress * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // リソースリンク集コンポーネント
    const RecommendedResources = () => {
        const ResourceLink = ({ name, url, desc, icon }: { name: string, url: string, desc: string, icon: string }) => (
            <li className="flex items-start space-x-3">
                <span className="text-2xl shrink-0">{icon}</span>
                <div>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="font-bold text-lg underline text-gray-900 hover:text-indigo-600 transition">
                        {name}
                    </a>
                    <p className="text-sm text-gray-700 leading-relaxed">{desc}</p>
                </div>
            </li>
        );

        return (
            <div className="space-y-8">
                {/* 1. 集中力ゲーム・育成系 */}
                <div className="bg-green-50 border-green-300 border-2 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-green-800 text-xl mb-2 flex items-center"><span className="mr-2">🎮</span> 1. 集中力ゲーム・育成系</h3>
                    <p className="text-sm text-green-700 mb-4 font-semibold">楽しみながら集中力を高めたい人向け。</p>
                    <ul className="space-y-4">
                        <ResourceLink 
                            icon="🌲" name="Forest" url="https://www.google.com/search?q=スマホアプリ+Forest" 
                            desc="集中時間に応じて「木」を育て、失敗すると枯れる。" 
                        />
                        <ResourceLink 
                            icon="🗺️" name="Focus Quest" url="https://www.google.com/search?q=スマホアプリ+Focus+Quest" 
                            desc="集中時間を「冒険」に見立て、目標達成でヒーローを育成。" 
                        />
                        <ResourceLink 
                            icon="🐟" name="スマホをやめれば魚が育つ" url="https://www.google.com/search?q=スマホアプリ+スマホをやめれば魚が育つ" 
                            desc="スマホを置くことで、かわいい「魚」が水槽で成長。" 
                        />
                        <ResourceLink 
                            icon="🐶" name="Focus Dog" url="https://www.google.com/search?q=スマホアプリ+Focus+Dog" 
                            desc="集中してドーナツを作り、相棒の犬を喜ばせる。" 
                        />
                    </ul>
                </div>

                {/* 2. 強制ロック・時間管理系 */}
                <div className="bg-red-50 border-red-300 border-2 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-red-800 text-xl mb-2 flex items-center"><span className="mr-2">⏰</span> 2. 強制ロック・時間管理系</h3>
                    <p className="text-sm text-red-700 mb-4 font-semibold">設定した時間、アプリの使用を物理的に制限したい人向けのアプリです。</p>
                    <ul className="space-y-4">
                        <ResourceLink 
                            icon="🛑" name="Detox" url="https://www.google.com/search?q=スマホアプリ+Detox" 
                            desc="シンプルなタイマー機能で、設定時間、スマホを強制ロック。" 
                        />
                        <ResourceLink 
                            icon="📊" name="UBhind" url="https://www.google.com/search?q=スマホアプリ+UBhind" 
                            desc="1日の利用時間を可視化し、制限時間10分前にアラーム通知。" 
                        />
                        <ResourceLink 
                            icon="⏳" name="StayFree" url="https://www.google.com/search?q=スマホアプリ+StayFree" 
                            desc="アプリごとの使用時間をトラッキングし、アプリの使用を制限。" 
                        />
                        <ResourceLink 
                            icon="⛔" name="使いすぎストップ" url="https://www.google.com/search?q=スマホアプリ+使いすぎストップ" 
                            desc="スマホの使用時間管理や制限を簡単に行える。" 
                        />
                    </ul>
                </div>

                {/* 3. ペアレンタルコントロール・家族管理系 */}
                <div className="bg-blue-50 border-blue-300 border-2 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-blue-800 text-xl mb-2 flex items-center"><span className="mr-2">👨‍👩‍👧‍👦</span> 3. ペアレンタルコントロール・家族管理系</h3>
                    <p className="text-sm text-blue-700 mb-4 font-semibold">主に子どもの利用を管理・制限するための機能を提供します。</p>
                    <ul className="space-y-4">
                        <ResourceLink 
                            icon="🌐" name="Google Family Link" url="https://www.google.com/search?q=スマホアプリ+Google+Family+Link" 
                            desc="Google公式。子どもの利用時間をリモート管理。" 
                        />
                        <ResourceLink 
                            icon="🍏" name="スクリーンタイム (iOS)" url="https://www.google.com/search?q=スマホアプリ+スクリーンタイム+iOS" 
                            desc="Apple公式。アプリごとの時間制限、休止時間設定。" 
                        />
                    </ul>
                </div>

                {/* 4. 脳科学・習慣化の知識・相談 */}
                <div className="bg-purple-50 border-purple-300 border-2 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-purple-800 text-xl mb-2 flex items-center"><span className="mr-2">🧠</span> 4. 脳科学・習慣化の知識・相談</h3>
                    <p className="text-sm text-purple-700 mb-4 font-semibold">依存のメカニズムを知り、専門的なサポート情報にアクセスします。</p>
                    <ul className="space-y-4">
                        <ResourceLink 
                            icon="📖" name="【脳科学】スマホがもたらすドーパミンの罠と対処法" url="https://www.google.com/search?q=【脳科学】スマホがもたらすドーパミンの罠と対処法" 
                            desc="Google検索結果を表示します。" 
                        />
                        <ResourceLink 
                            icon="🧘" name="今日からできる！デジタルデトックス入門ガイド" url="https://www.google.com/search?q=今日からできる！デジタルデトックス入門ガイド" 
                            desc="Google検索結果を表示します。" 
                        />
                        <ResourceLink 
                            icon="🔔" name="集中力を高めるための通知設定の極意" url="https://www.google.com/search?q=集中力を高めるための通知設定の極意" 
                            desc="Google検索結果を表示します。" 
                        />
                        
                        <hr className="border-purple-200 my-4" />
                        
                        <li className="flex items-start space-x-3">
                            <span className="text-2xl shrink-0">🏥</span>
                            <div>
                                <span className="font-bold text-gray-900">都道府県別依存症相談窓口: </span>
                                <a href="https://www.zmhwc.jp/index.html" target="_blank" rel="noopener noreferrer" className="font-bold text-lg underline text-indigo-600 hover:text-indigo-800 transition">
                                    詳細情報へ
                                </a>
                            </div>
                        </li>
                        <li className="flex items-start space-x-3">
                            <span className="text-2xl shrink-0">⚓</span>
                            <div>
                                <span className="font-bold text-gray-900">ひょうご・こうべ依存症対策センター: </span>
                                <a href="https://www.city.kobe.lg.jp/a37430/izon.html" target="_blank" rel="noopener noreferrer" className="font-bold text-lg underline text-indigo-600 hover:text-indigo-800 transition">
                                    連絡先一覧へ
                                </a>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        );
    };

    // メインコンテンツのレンダリング（タブ切り替え）
    const renderContent = () => {
        // Calculate Filtered History
        // 履歴表示のフィルタリング計算
        const filteredRecords = useMemo(() => {
            // 'all' filter
            if (historyFilter === 'all') {
                return sortedRecords;
            }

            const now = new Date();
            // Reset time part for date comparison
            now.setHours(23, 59, 59, 999); 
            
            const days = parseInt(historyFilter.replace('days', ''));
            const cutoff = new Date();
            cutoff.setDate(now.getDate() - days + 1); 
            cutoff.setHours(0, 0, 0, 0);

            return sortedRecords.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate >= cutoff && recordDate <= now;
            });
        }, [sortedRecords, historyFilter]);

        const filteredTotalTime = filteredRecords.reduce((acc, cur) => acc + cur.timeUsed, 0);
        const filteredAvgTime = filteredRecords.length > 0 ? Math.round(filteredTotalTime / filteredRecords.length) : 0;

        switch (activeTab) {
            case 'data-entry':
                return (
                    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                         <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">📅 日々の記録入力</h2>
                            <div className="space-y-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">日付</label><input type="date" value={newRecord.date} onChange={(e) => setNewRecord({...newRecord, date: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg" /></div>
                                <div><label className="block text-sm font-bold text-green-700 mb-1">利用時間 (分)</label><input type="number" value={newRecord.timeUsed} onChange={(e) => setNewRecord({...newRecord, timeUsed: e.target.value})} className="w-full p-4 text-3xl font-extrabold border-2 border-green-400 rounded-lg text-center text-green-800" /></div>
                                <div className="flex justify-center space-x-2 flex-wrap gap-y-2 mt-2">
                                    {[-60, -30, -10, 10, 30, 60].map(val => (
                                        <button key={val} onClick={() => setNewRecord(p => ({...p, timeUsed: String(Math.max(0, (parseInt(p.timeUsed)||0) + val))}))} className={`px-3 py-2 rounded-lg font-bold text-sm ${val < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{val > 0 ? '+' : ''}{val}分</button>
                                    ))}
                                </div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">一言レビュー</label><textarea value={newRecord.review} onChange={(e) => setNewRecord({...newRecord, review: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg" rows={2} placeholder="今日はどうでしたか？" /></div>
                                <button onClick={addDailyRecord} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition">記録を保存</button>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h2 className="text-xl font-bold text-gray-700">📜 最近の記録履歴</h2>
                                <div className="flex space-x-2">
                                    <button 
                                        onClick={() => setHistoryFilter('7days')}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${historyFilter === '7days' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                    >
                                        過去7日間
                                    </button>
                                    <button 
                                        onClick={() => setHistoryFilter('30days')}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${historyFilter === '30days' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                    >
                                        過去30日間
                                    </button>
                                    <button 
                                        onClick={() => setHistoryFilter('all')}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${historyFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                    >
                                        全期間
                                    </button>
                                </div>
                            </div>
                            
                            {filteredRecords.length > 0 && (
                                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex justify-around text-center">
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold">合計時間</p>
                                        <p className="text-lg font-extrabold text-blue-700">{Math.floor(filteredTotalTime / 60)}時間 {filteredTotalTime % 60}分</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold">1日平均</p>
                                        <p className="text-lg font-extrabold text-blue-700">{filteredAvgTime}分</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold">記録日数</p>
                                        <p className="text-lg font-extrabold text-blue-700">{filteredRecords.length}日</p>
                                    </div>
                                </div>
                            )}

                            {filteredRecords.length === 0 ? <p className="text-gray-500 text-center py-4">選択された期間の記録はありません。</p> : (
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {filteredRecords.slice().reverse().map((record, idx) => (
                                        <div key={idx} onClick={() => openReviewModal(record)} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition">
                                            <div>
                                                <p className="font-bold text-gray-800">{record.date}</p>
                                                <p className="text-xs text-gray-500 truncate max-w-[200px]">{record.review || 'レビューなし'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-lg font-bold ${record.timeUsed <= goalTime ? 'text-green-600' : 'text-red-600'}`}>{record.timeUsed}分</p>
                                                <p className="text-xs text-indigo-500">編集</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'goal-settings':
                return (
                    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">🎯 目標設定</h2>
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-indigo-700 mb-2">1日の目標利用時間 (分)</label>
                                <div className="flex items-center space-x-2">
                                    <input type="number" ref={goalTimeInputRef} defaultValue={goalTime} className="flex-grow p-4 text-3xl font-extrabold border-2 border-indigo-400 rounded-lg text-center text-indigo-800" />
                                    <span className="text-xl font-bold text-gray-500">分</span>
                                </div>
                                <button onClick={setGoalTimeHandler} className="w-full mt-4 bg-indigo-600 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition">設定を更新</button>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200"><h4 className="font-bold text-yellow-800 mb-1">💡 ヒント</h4><p className="text-sm text-yellow-800">いきなり厳しい目標を立てるのではなく、現状より少し短い時間を設定して、徐々に減らしていくのがコツです。</p></div>
                        </div>
                        {/* 変更箇所: やさしい緑色に変更し、アイコンもクローバーに変更 */}
                        <div className="bg-green-50 p-6 rounded-xl shadow-md border border-green-200 text-center">
                            <h3 className="text-xl font-bold text-green-800 mb-4">🍀 依存度チェック</h3>
                            <button onClick={() => setIsModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition">診断テストをはじめる</button>
                        </div>
                         <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">⚙️ データ管理</h2>
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                                <div>
                                    <p className="font-bold text-gray-800">記録履歴のリセット</p>
                                    <p className="text-sm text-gray-500">これまでの日々の記録データをすべて削除します。</p>
                                </div>
                                <button onClick={resetDailyRecords} className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 px-4 rounded-lg transition text-sm border border-red-200">
                                    リセット
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-gray-800">ランクスコアのリセット</p>
                                    <p className="text-sm text-gray-500">現在のランクと獲得スコアを0に戻します。</p>
                                </div>
                                <button onClick={resetRankScore} className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 px-4 rounded-lg transition text-sm border border-red-200">
                                    リセット
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'dashboard':
                return (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h2 className="text-xl font-bold text-gray-700">📊 利用時間分析</h2>
                                <div className="flex space-x-2">
                                    <button 
                                        onClick={() => setChartFilter('7days')}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${chartFilter === '7days' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                    >
                                        過去7日間
                                    </button>
                                    <button 
                                        onClick={() => setChartFilter('30days')}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${chartFilter === '30days' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                    >
                                        過去30日間
                                    </button>
                                </div>
                            </div>
                            <ChartComponent chartjsConstructor={chartjsConstructorRef.current} dailyRecords={dailyRecords} goalTime={goalTime} chartRef={chartRef} chartInstance={chartInstance} isChartJsLoaded={isChartJsLoaded} filterType={chartFilter} />
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                             {reportSummary}
                             <BadgesAndAchievement />
                        </div>
                    </div>
                );
            case 'resources':
                return (
                    <div className="max-w-3xl mx-auto animate-fade-in">
                        <h2 className="text-2xl font-bold text-gray-700 mb-6">📚 お役立ちリソース</h2>
                        <RecommendedResources />
                    </div>
                );
            default: return null;
        }
    };

    return (
        <>
            <NoSpinnerStyles />
            <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-24">
                <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 shadow-lg sticky top-0 z-40">
                    <div className="max-w-5xl mx-auto flex justify-between items-center">
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Digital Wellbeing</h1>
                    </div>
                </header>

                <main className="max-w-5xl mx-auto p-4 md:p-6">
                    {toastMessage && (
                        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-bounce">
                            {toastMessage}
                        </div>
                    )}
                    {renderContent()}
                </main>

                <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg z-40 pb-safe">
                    <div className="max-w-5xl mx-auto flex justify-around items-center">
                        {[
                            { id: 'data-entry', label: '入力', icon: '✏️' },
                            { id: 'dashboard', label: '分析', icon: '📊' },
                            { id: 'goal-settings', label: '目標', icon: '🎯' },
                            { id: 'resources', label: 'ガイド', icon: '📚' },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center w-full py-3 transition ${activeTab === tab.id ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}>
                                <span className="text-2xl mb-1">{tab.icon}</span>
                                <span className="text-xs font-bold">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Modals */}
                <AddictionTestModal isOpen={isModalOpen} setIsModalOpen={setIsModalOpen} testQuestions={testQuestions} testAnswers={testAnswers} handleAnswerChange={handleAnswerChange} calculateScore={calculateScore} resetTest={resetTest} testResult={testResult} testTotalScore={testTotalScore} handleOptionClick={handleOptionClick} />
                <ReviewEditModal isOpen={isReviewModalOpen} onClose={closeReviewModal} editingRecord={editingRecord} editReviewText={editReviewText} setEditReviewText={setEditReviewText} handleUpdateReview={handleUpdateReview} handleDeleteRecord={handleDeleteRecord} goalTime={goalTime} />
                <RankDetailModal isOpen={isRankModalOpen} onClose={() => setIsRankModalOpen(false)} currentRank={currentRank} currentScore={rankScore} allRanks={RANKS} />
                <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} data={feedbackData} />   
            </div>
        </>
    );
};

export default DigitalWellbeingApp;