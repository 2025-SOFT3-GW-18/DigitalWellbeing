/*
==============================================================
Digital Wellbeing App (page.tsx)
- Fix: Restore Tab Persistence on Reload
- Feature: Reset to 'Diagnosis' tab only on Manual Login
- Includes: Auto Login, Secure Login, Animal Faces, Enter Key
==============================================================
*/

"use client";

import React, { useState, useEffect, useRef } from 'react';

// ===============================================
// 1. 型定義・インターフェース
// ===============================================

interface User {
    id: string;
    name: string;
    avatar: string;
    pin: string;
}

type ChartConstructor = any;
type ChartInstance = any;

interface TestHistoryRecord {
    id: number;
    date: string;
    score: number;
    level: string;
    recommendation: string;
}

interface AppStat {
    id: string;
    name: string;
    category: string;
    icon: string;
    desc: string;
    url: string;
    successRate: number;
    totalVotes: number;
    ratings: {
        effectiveness: number;
        fun: number;
        ease: number;
        continuity: number;
        design: number;
    };
}

interface AddictionType {
    id: string;
    name: string;
    icon: string;
    description: string;
    advice: string;
    recommendedCategories: string[];
    recommendedAppIds: string[];
}

// ===============================================
// 2. 定数定義
// ===============================================

// ユーザーアイコン (動物の正面顔のみ)
const AVATAR_OPTIONS = [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', 
    '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', 
    '🐥', '🦉', '🐧', '🐙', '🐺', '🐗', '🐴', '🦄', '🐲', 
    '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
    '🙈', '🙉', '🙊',
    '🐝', '🐞', '🦋'
];

const testQuestions = [
    "スマートフォンを使う時間を減らそうとしたが、結局できなかった。",
    "食事中や会話中など、本来スマホを使うべきではない状況で、無意識に手に取ってしまう。",
    "通知が来ていないか、理由もなく頻繁にスマホをチェックしてしまう。",
    "スマホが手元にないときや、電波が悪いときに、不安やイライラを感じる。",
    "睡眠時間が削られたり、仕事や学業の効率が落ちるなど、生活に悪影響が出ている。",
    "スマホを使っているせいで、趣味や運動、友人との交流を疎かにしている。",
    "疲労感や目の疲れ、手首の痛みなど、身体的な不調を感じることがある。",
    "家族や友人から、スマホの使いすぎについて指摘されたことがある。",
    "ベッドに入ってからも長時間スマホを見てしまい、寝つきが悪くなる。",
    "重要な用事がないのに、気がつくとスマホを操作している時間が長い。",
];

const IMPROVEMENT_MESSAGES = [
    "素晴らしい進歩です！前回よりスコアが改善しました。🌟",
    "おめでとうございます！意識の変化が結果に表れています。😊",
    "良い傾向です！少しずつスマホとの距離感が適正になってきています。👍",
    "ナイスコントロール！時間を味方につけていますね。🌈",
    "前回よりも依存度が下がっています。リアルの時間を大切に！✨"
];

const WORSENING_MESSAGES = [
    "前回よりスコアが上がってしまいました。深呼吸しましょう。🍃",
    "注意信号です。知らず知らずのうちに利用時間が増えていませんか？☕",
    "疲れが溜まっているかもしれません。目を閉じてリラックスしましょう。😌",
    "油断は禁物です。物理的にスマホを遠ざける工夫をしてみましょう。🔕",
    "リフレッシュが必要です！少しの間、デジタル機器から離れましょう。🌳"
];

const SAME_SCORE_MESSAGES = [
    "前回と同じスコアです。現状を維持できていますね。⚖️",
    "変化はありません。油断すると増えてしまうので注意です。👀"
];

const ADDICTION_TYPES: { [key: string]: AddictionType } = {
    sns: {
        id: 'sns', name: 'SNS・承認欲求タイプ', icon: '🐰',
        description: '「いいね」や返信が気になり、常に誰かと繋がっていないと不安になるタイプです。',
        advice: '通知を完全にオフにする時間を設けるか、強制的にアプリをロックするツールが有効です。',
        recommendedCategories: ['lock'], recommendedAppIds: ['detox', 'stayfree']
    },
    game: {
        id: 'game', name: 'ゲーム・没頭タイプ', icon: '🎮',
        description: '現実逃避や達成感を求めて、長時間ゲームや動画に没頭してしまうタイプです。',
        advice: '「やめる」こと自体をゲーム化できるアプリや、育成要素のあるツールで置き換えましょう。',
        recommendedCategories: ['gamification'], recommendedAppIds: ['forest', 'focus_quest']
    },
    habit: {
        id: 'habit', name: '無意識・習慣タイプ', icon: '👻',
        description: '特に目的はないのに、手持ち無沙汰で無意識にスマホロックを解除してしまうタイプです。',
        advice: 'スマホを触った瞬間に「気づき」を与えるアプリや、利用時間を可視化するツールがおすすめです。',
        recommendedCategories: ['gamification', 'lock'], recommendedAppIds: ['fish', 'ubhind', 'stop']
    },
    work: {
        id: 'work', name: '仕事・強迫観念タイプ', icon: '💼',
        description: '休日や夜間でも仕事の連絡やニュースが気になり、脳が休まらないタイプです。',
        advice: 'ON/OFFを明確にするため、時間帯で区切って利用制限できる機能や、ペアレンタルコントロールの自己適用が有効です。',
        recommendedCategories: ['family', 'lock'], recommendedAppIds: ['screentime', 'detox']
    }
};

const PERSONALIZE_QUESTIONS = [
    {
        id: 1, text: "スマホを手に取る「一番多い理由」は？",
        options: [
            { label: "SNSの通知やタイムラインの確認", type: 'sns' },
            { label: "ゲームや動画視聴での暇つぶし", type: 'game' },
            { label: "特に理由はないが手持ち無沙汰で", type: 'habit' },
            { label: "仕事のメールやニュースチェック", type: 'work' }
        ]
    },
    {
        id: 2, text: "スマホがないと、どんな気分になりますか？",
        options: [
            { label: "誰からも連絡が来ないか不安", type: 'sns' },
            { label: "退屈でつまらない", type: 'game' },
            { label: "なんとなくソワソワする", type: 'habit' },
            { label: "重要な情報を見逃しそうで怖い", type: 'work' }
        ]
    },
    {
        id: 3, text: "もし対策アプリを入れるなら？",
        options: [
            { label: "強制的に使えなくしてほしい", type: 'sns' },
            { label: "楽しみながら減らしたい", type: 'game' },
            { label: "使いすぎた時だけ教えてほしい", type: 'habit' },
            { label: "時間帯できっちり分けたい", type: 'work' }
        ]
    }
];

const initialAppStats: AppStat[] = [
    { id: 'forest', name: 'Forest', category: 'gamification', icon: '🌲', desc: '集中時間に応じて「木」を育て、失敗すると枯れる。', url: 'https://www.google.com/search?q=スマホアプリ+Forest', successRate: 85, totalVotes: 1240, ratings: { effectiveness: 4.5, fun: 4.8, ease: 4.0, continuity: 4.2, design: 5.0 } },
    { id: 'focus_quest', name: 'Focus Quest', category: 'gamification', icon: '🗺️', desc: '集中時間を「冒険」に見立て、目標達成でヒーローを育成。', url: 'https://www.google.com/search?q=スマホアプリ+Focus+Quest', successRate: 78, totalVotes: 530, ratings: { effectiveness: 4.0, fun: 5.0, ease: 3.5, continuity: 4.5, design: 4.2 } },
    { id: 'fish', name: 'スマホをやめれば魚が育つ', category: 'gamification', icon: '🐟', desc: 'スマホを置くことで、かわいい「魚」が水槽で成長。', url: 'https://www.google.com/search?q=スマホアプリ+スマホをやめれば魚が育つ', successRate: 82, totalVotes: 320, ratings: { effectiveness: 3.8, fun: 4.2, ease: 5.0, continuity: 3.9, design: 4.0 } },
    { id: 'focus_dog', name: 'Focus Dog', category: 'gamification', icon: '🐶', desc: '集中してドーナツを作り、相棒の犬を喜ばせる。', url: 'https://www.google.com/search?q=スマホアプリ+Focus+Dog', successRate: 75, totalVotes: 210, ratings: { effectiveness: 3.5, fun: 4.5, ease: 4.5, continuity: 3.8, design: 4.8 } },
    { id: 'detox', name: 'Detox', category: 'lock', icon: '🛑', desc: 'シンプルなタイマー機能で、設定時間、スマホを強制ロック。', url: 'https://www.google.com/search?q=スマホアプリ+Detox', successRate: 92, totalVotes: 890, ratings: { effectiveness: 5.0, fun: 2.0, ease: 4.8, continuity: 3.5, design: 3.0 } },
    { id: 'ubhind', name: 'UBhind', category: 'lock', icon: '📊', desc: '利用時間を可視化し、制限時間10分前にアラーム通知。', url: 'https://www.google.com/search?q=スマホアプリ+UBhind', successRate: 68, totalVotes: 450, ratings: { effectiveness: 4.2, fun: 3.0, ease: 3.5, continuity: 4.0, design: 3.8 } },
    { id: 'stayfree', name: 'StayFree', category: 'lock', icon: '⏳', desc: 'アプリごとの使用時間をトラッキングし、アプリの使用を制限。', url: 'https://www.google.com/search?q=スマホアプリ+StayFree', successRate: 74, totalVotes: 600, ratings: { effectiveness: 4.5, fun: 3.5, ease: 4.0, continuity: 4.2, design: 4.5 } },
    { id: 'stop', name: '使いすぎストップ', category: 'lock', icon: '⛔', desc: 'スマホの使用時間管理や制限を簡単に行える。', url: 'https://www.google.com/search?q=スマホアプリ+使いすぎストップ', successRate: 70, totalVotes: 300, ratings: { effectiveness: 4.0, fun: 2.5, ease: 4.5, continuity: 3.8, design: 3.5 } },
    { id: 'family_link', name: 'Google Family Link', category: 'family', icon: '🌐', desc: 'Google公式。子どもの利用時間をリモート管理。', url: 'https://www.google.com/search?q=スマホアプリ+Google+Family+Link', successRate: 88, totalVotes: 1500, ratings: { effectiveness: 4.8, fun: 2.5, ease: 3.5, continuity: 4.8, design: 4.0 } },
    { id: 'screentime', name: 'スクリーンタイム (iOS)', category: 'family', icon: '🍏', desc: 'Apple公式。アプリごとの時間制限、休止時間設定。', url: 'https://www.google.com/search?q=スマホアプリ+スクリーンタイム+iOS', successRate: 80, totalVotes: 2000, ratings: { effectiveness: 4.5, fun: 3.0, ease: 5.0, continuity: 4.5, design: 4.5 } },
];

// LocalStorage キー
const KEY_USERS = 'dw_users';
const KEY_ANSWERS = 'dw_testAnswers';
const KEY_SCORE = 'dw_testTotalScore';
const KEY_RESULT = 'dw_testResult';
const KEY_HISTORY = 'dw_testHistory';
const KEY_APP_STATS = 'dw_appStats';
const KEY_TYPE_RESULT = 'dw_typeResult';
const KEY_LAST_USER_ID = 'dw_last_user_id'; // 自動ログイン用
const KEY_ACTIVE_TAB = 'dw_active_tab'; // ★復活: タブ保存用

// ===============================================
// 3. 初期値設定
// ===============================================

const initialTestAnswers = new Array(testQuestions.length).fill(null);
const initialTestScore: number | null = null;
const initialTestResult: { level: string, recommendation: string } | null = null;

// ===============================================
// 4. ヘルパー関数
// ===============================================

const getUserKey = (key: string, userId: string) => `${userId}_${key}`;

const loadFromLocalStorage = <T,>(key: string, defaultValue: T, userId?: string): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const storageKey = userId ? getUserKey(key, userId) : key;
        const storedValue = localStorage.getItem(storageKey);
        if (storedValue === null || storedValue === 'undefined') return defaultValue;
        return JSON.parse(storedValue) as T;
    } catch (error) {
        console.error(`Error loading key ${key} from localStorage:`, error);
        return defaultValue;
    }
};

const saveToLocalStorage = (key: string, value: any, userId?: string) => {
    if (typeof window === 'undefined') return;
    try {
        const storageKey = userId ? getUserKey(key, userId) : key;
        const valueToStore = JSON.stringify(value);
        localStorage.setItem(storageKey, valueToStore);
    } catch (error) {
        console.error(`Error saving key ${key} to localStorage:`, error);
    }
};

const formatDate = (date: Date): string => date.toISOString().slice(0, 10).replace(/-/g, '/');

const getResultFromScore = (score: number) => {
    let level = "重度依存";
    let recommendation = "スマートフォンが生活を支配している可能性があります。\n専門家への相談も検討してください。";
    if (score <= 6) { level = "低依存"; recommendation = "健康的な利用習慣が保たれています。\n今のバランスを大切にしてください。"; }
    else if (score <= 14) { level = "軽度依存"; recommendation = "少し依存の傾向が見られます。\n意識的にデジタルデトックスの時間を設けましょう。"; }
    else if (score <= 23) { level = "中度依存"; recommendation = "生活に支障が出始めています。\n具体的な対策を直ちに実行しましょう。"; }
    return { level, recommendation };
};

// 診断レベルに応じたスタイルを取得する共通関数
const getResultStyle = (level: string) => {
    switch (level) {
        case "低依存": return { bg: "bg-green-50", border: "border-green-300", text: "text-green-700", scoreText: "text-green-800", icon: "🍃" };
        case "軽度依存": return { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700", scoreText: "text-yellow-800", icon: "⚠️" };
        case "中度依存": return { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700", scoreText: "text-orange-800", icon: "🔥" };
        case "重度依存": return { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", scoreText: "text-red-800", icon: "🚨" };
        default: return { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700", scoreText: "text-gray-800", icon: "❓" };
    }
};

// ===============================================
// 5. コンポーネント定義
// ===============================================

// チャートコンポーネント (共通)
const ResourceChart = ({ type, data, options, chartjsConstructor, isChartJsLoaded }: any) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<ChartInstance | null>(null);
    useEffect(() => {
        if (isChartJsLoaded && chartjsConstructor && canvasRef.current) {
            if (chartInstance.current) chartInstance.current.destroy();
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) { chartInstance.current = new chartjsConstructor(ctx, { type, data, options }); }
        }
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [data, options, type, chartjsConstructor, isChartJsLoaded]);
    if (!isChartJsLoaded) return <div className="h-32 bg-gray-100 rounded animate-pulse flex items-center justify-center text-xs text-gray-400">Loading...</div>;
    return <div className="relative w-full h-full flex justify-center"><canvas ref={canvasRef} /></div>;
};

// アンケートモーダル (★星評価)
const SurveyModal = ({ isOpen, onClose, app, onSubmit }: any) => {
    const [isSuccess, setIsSuccess] = useState(true);
    const [ratings, setRatings] = useState({ effectiveness: 3, fun: 3, ease: 3, continuity: 3, design: 3 });
    if (!isOpen || !app) return null;
    const handleSubmit = () => { onSubmit(app.id, isSuccess, ratings); onClose(); };
    const ratingLabels: {[key: string]: string} = { effectiveness: '効果', fun: '楽しさ', ease: '手軽さ', continuity: '継続性', design: 'デザイン' };
    
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[70]" onClick={onClose}>
            <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center"><span className="text-2xl mr-2">{app.icon}</span> {app.name} の評価</h3>
                <div className="mb-4">
                    <p className="font-bold text-sm text-gray-600 mb-2">目標は達成できましたか？</p>
                    <div className="flex space-x-2">
                        <button onClick={() => setIsSuccess(true)} className={`flex-1 py-2 rounded-lg font-bold border transition ${isSuccess ? 'bg-green-100 border-green-400 text-green-800' : 'bg-white border-gray-200 text-gray-400'}`}>はい</button>
                        <button onClick={() => setIsSuccess(false)} className={`flex-1 py-2 rounded-lg font-bold border transition ${!isSuccess ? 'bg-red-100 border-red-400 text-red-800' : 'bg-white border-gray-200 text-gray-400'}`}>いいえ</button>
                    </div>
                </div>
                <div className="mb-6 space-y-3">
                    <p className="font-bold text-sm text-gray-600">詳細評価 (★1-5)</p>
                    {Object.keys(ratings).map((key) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 font-bold w-16">{ratingLabels[key]}</span>
                            <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRatings({ ...ratings, [key]: star })}
                                        className={`text-2xl focus:outline-none transition-colors ${
                                            star <= (ratings as any)[key] ? 'text-yellow-400' : 'text-gray-200'
                                        }`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={handleSubmit} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition">投票してデータを更新</button>
            </div>
        </div>
    );
};

// アプリカード (共通)
const AppCard = ({ app, chartjsConstructor, isChartJsLoaded, onOpenSurvey }: any) => {
    const pieData = { labels: ['成功', '失敗'], datasets: [{ data: [app.successRate, 100 - app.successRate], backgroundColor: ['#4ade80', '#e5e7eb'], borderWidth: 0 }] };
    const pieOptions = { plugins: { legend: { display: false }, tooltip: { enabled: false } }, maintainAspectRatio: false };
    const radarData = { labels: ['効果', '楽しさ', '手軽さ', '継続性', 'デザイン'], datasets: [{ label: '評価', data: [app.ratings.effectiveness, app.ratings.fun, app.ratings.ease, app.ratings.continuity, app.ratings.design], backgroundColor: 'rgba(99, 102, 241, 0.2)', borderColor: 'rgba(99, 102, 241, 1)', borderWidth: 1, pointBackgroundColor: 'rgba(99, 102, 241, 1)', pointRadius: 1 }] };
    const radarOptions = { plugins: { legend: { display: false } }, scales: { r: { min: 0, max: 5, ticks: { display: false, stepSize: 1 }, pointLabels: { display: true, font: { size: 9 }, color: '#4b5563' } } }, maintainAspectRatio: false };

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
                <div className="flex items-center mb-2"><span className="text-3xl mr-3">{app.icon}</span><div><h4 className="font-bold text-lg text-gray-800 leading-tight">{app.name}</h4><p className="text-xs text-gray-500">{app.totalVotes}件の評価</p></div></div>
                <p className="text-sm text-gray-600 mb-3 min-h-[40px]">{app.desc}</p>
                <div className="flex gap-2"><a href={app.url} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-bold transition">検索する 🔍</a><button onClick={() => onOpenSurvey(app)} className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg font-bold transition">投票する 🗳️</button></div>
            </div>
            <div className="flex gap-2 h-48 md:w-96 shrink-0">
                <div className="w-2/5 relative flex flex-col items-center justify-center">
                    <p className="text-[10px] text-gray-400 font-bold mb-1">目標達成率</p>
                    <div className="relative w-full flex-1 min-h-0"><ResourceChart type="doughnut" data={pieData} options={pieOptions} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} /><div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-600">{app.successRate}%</div></div>
                </div>
                <div className="w-3/5 relative flex flex-col items-center">
                    <p className="text-[10px] text-gray-400 font-bold mb-1">特徴分析</p>
                    <div className="w-full flex-1 min-h-0"><ResourceChart type="radar" data={radarData} options={radarOptions} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} /></div>
                </div>
            </div>
        </div>
    );
};

// リソースセクション
const ResourceSection = ({ appStats, chartjsConstructor, isChartJsLoaded, onOpenSurvey }: any) => {
    return (
        <div className="space-y-8">
            <div className="bg-green-50 border-green-200 border rounded-xl p-4 md:p-6 shadow-sm"><h3 className="font-bold text-green-800 text-xl mb-2 flex items-center"><span className="mr-2">🎮</span> 1. 集中力ゲーム・育成系</h3><div className="space-y-3">{appStats.filter((a: any) => a.category === 'gamification').map((app: any) => <AppCard key={app.id} app={app} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} onOpenSurvey={onOpenSurvey} />)}</div></div>
            <div className="bg-red-50 border-red-200 border rounded-xl p-4 md:p-6 shadow-sm"><h3 className="font-bold text-red-800 text-xl mb-2 flex items-center"><span className="mr-2">⏰</span> 2. 強制ロック・時間管理系</h3><div className="space-y-3">{appStats.filter((a: any) => a.category === 'lock').map((app: any) => <AppCard key={app.id} app={app} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} onOpenSurvey={onOpenSurvey} />)}</div></div>
            <div className="bg-blue-50 border-blue-200 border rounded-xl p-4 md:p-6 shadow-sm"><h3 className="font-bold text-blue-800 text-xl mb-2 flex items-center"><span className="mr-2">👨‍👩‍👧‍👦</span> 3. ペアレンタルコントロール・家族管理</h3><div className="space-y-3">{appStats.filter((a: any) => a.category === 'family').map((app: any) => <AppCard key={app.id} app={app} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} onOpenSurvey={onOpenSurvey} />)}</div></div>
        </div>
    );
};

// パーソナライズ診断セクション
const PersonalizeSection = ({ currentUser, appStats, chartjsConstructor, isChartJsLoaded, onOpenSurvey }: any) => {
    const [step, setStep] = useState<'intro' | 'question' | 'result'>('intro');
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [scores, setScores] = useState<{[key: string]: number}>({ sns: 0, game: 0, habit: 0, work: 0 });
    const [resultType, setResultType] = useState<AddictionType | null>(null);

    useEffect(() => {
        const savedResult = loadFromLocalStorage(KEY_TYPE_RESULT, null, currentUser.id);
        if (savedResult) { setResultType(savedResult); setStep('result'); }
        else { setStep('intro'); setResultType(null); }
    }, [currentUser.id]);

    const handleStart = () => { setStep('question'); setCurrentQuestionIdx(0); setScores({ sns: 0, game: 0, habit: 0, work: 0 }); };

    const handleAnswer = (type: string) => {
        const newScores = { ...scores, [type]: scores[type] + 1 };
        setScores(newScores);
        if (currentQuestionIdx < PERSONALIZE_QUESTIONS.length - 1) { setCurrentQuestionIdx(currentQuestionIdx + 1); } 
        else {
            let maxScore = -1; let maxType = 'habit';
            Object.entries(newScores).forEach(([key, val]) => { if (val > maxScore) { maxScore = val; maxType = key; } });
            const result = ADDICTION_TYPES[maxType];
            setResultType(result); 
            saveToLocalStorage(KEY_TYPE_RESULT, result, currentUser.id); 
            setStep('result');
        }
    };

    const handleRetake = () => { setResultType(null); saveToLocalStorage(KEY_TYPE_RESULT, null, currentUser.id); handleStart(); };

    const recommendedApps = resultType ? appStats.filter((app: AppStat) => resultType.recommendedAppIds.includes(app.id) || (resultType.recommendedCategories.includes(app.category) && Math.random() > 0.5)).slice(0, 3) : [];

    if (step === 'intro') {
        return (
            <div className="max-w-2xl mx-auto text-center pt-10">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-teal-100">
                    <div className="text-6xl mb-4">🔍</div><h2 className="text-2xl font-bold text-gray-800 mb-4">依存タイプ診断</h2><p className="text-gray-600 mb-8 leading-relaxed">依存の形は人それぞれです。<br/>SNS、ゲーム、無意識の癖…<br/>あなたの傾向を分析し、最適な対策アプリを提案します。</p><button onClick={handleStart} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 px-10 rounded-full shadow-lg transition transform hover:scale-105">診断をはじめる (3問)</button>
                </div>
            </div>
        );
    }
    if (step === 'question') {
        const q = PERSONALIZE_QUESTIONS[currentQuestionIdx];
        return (
            <div className="max-w-xl mx-auto pt-10 animate-fade-in">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                    <div className="mb-6 flex justify-between items-center text-sm text-gray-400"><span>QUESTION {currentQuestionIdx + 1} / {PERSONALIZE_QUESTIONS.length}</span></div>
                    <h3 className="text-xl font-bold text-gray-800 mb-8">{q.text}</h3>
                    <div className="space-y-3">{q.options.map((opt: any, idx: number) => (<button key={idx} onClick={() => handleAnswer(opt.type)} className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-teal-50 hover:border-teal-300 transition font-semibold text-gray-700">{opt.label}</button>))}</div>
                </div>
            </div>
        );
    }
    return (
        <div className="max-w-3xl mx-auto pt-6 animate-fade-in">
             <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-teal-500 mb-8 text-center">
                <p className="text-gray-500 font-bold mb-2">{currentUser.name} さんのタイプは…</p><div className="text-6xl mb-4">{resultType?.icon}</div><h2 className="text-3xl font-extrabold text-teal-700 mb-4">{resultType?.name}</h2><p className="text-gray-700 mb-6 leading-relaxed max-w-lg mx-auto">{resultType?.description}</p><div className="bg-teal-50 p-4 rounded-lg inline-block text-teal-800 text-sm font-bold">💡 アドバイス: {resultType?.advice}</div><div className="mt-6"><button onClick={handleRetake} className="text-sm text-gray-400 underline hover:text-teal-600">もう一度診断する</button></div>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center"><span className="mr-2">🎁</span> あなたへの提案アプリ</h3>
            <div className="space-y-4">{recommendedApps.map((app: any) => (<AppCard key={app.id} app={app} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} onOpenSurvey={onOpenSurvey} />))}</div>
        </div>
    );
};

// 知識セクション
const KnowledgeSection = () => {
    const KnowledgeLink = ({ icon, title, url, isExternal }: any) => (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block p-4 bg-white rounded-lg border border-purple-100 shadow-sm hover:shadow-md transition hover:bg-purple-50 flex items-center"><span className="text-3xl mr-4">{icon}</span><div className="flex-1"><p className="font-bold text-gray-800 text-base mb-1">{title}</p><p className="text-xs text-indigo-500 font-bold flex items-center">{isExternal ? '公式サイトへ移動' : 'Google検索結果を表示'} <span className="ml-1">{isExternal ? '↗' : '🔍'}</span></p></div></a>
    );
    return (
        <div className="space-y-6">
            <div className="bg-purple-50 border-purple-200 border rounded-xl p-6 shadow-sm">
                <div className="mb-6"><h3 className="font-bold text-purple-800 text-xl mb-2 flex items-center">依存のメカニズムを知り、専門的なサポート情報にアクセスします。</h3></div>
                <h4 className="font-bold text-gray-700 mb-3 border-l-4 border-purple-400 pl-3">読み物・知識</h4>
                <div className="grid grid-cols-1 gap-3 mb-6"><KnowledgeLink icon="📖" title="【脳科学】スマホがもたらすドーパミンの罠と対処法" url="https://www.google.com/search?q=【脳科学】スマホがもたらすドーパミンの罠と対処法" /><KnowledgeLink icon="🧘" title="今日からできる！デジタルデトックス入門ガイド" url="https://www.google.com/search?q=今日からできる！デジタルデトックス入門ガイド" /><KnowledgeLink icon="🔔" title="集中力を高めるための通知設定の極意" url="https://www.google.com/search?q=集中力を高めるための通知設定の極意" /></div>
                <h4 className="font-bold text-gray-700 mb-3 border-l-4 border-purple-400 pl-3">専門機関・相談窓口</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><KnowledgeLink icon="🏥" title="都道府県別依存症相談窓口" url="https://www.zmhwc.jp/index.html" isExternal /><KnowledgeLink icon="⚓" title="ひょうご・こうべ依存症対策センター" url="https://www.city.kobe.lg.jp/a37430/izon.html" isExternal /></div>
            </div>
        </div>
    );
};

// 履歴詳細モーダル (★共通関数を使用)
const HistoryDetailModal = ({ isOpen, onClose, record }: { isOpen: boolean, onClose: () => void, record: TestHistoryRecord | null }) => {
    if (!isOpen || !record) return null;
    
    // 共通スタイル関数を使用
    const style = getResultStyle(record.level);

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                <div className="text-center mb-6"><p className="text-sm font-bold text-gray-500 mb-1">{record.date} の記録</p><h3 className="text-2xl font-extrabold text-gray-800">診断結果詳細</h3></div>
                
                {/* 診断結果の表示部分 */}
                <div className={`p-6 ${style.bg} border-2 ${style.border} rounded-xl shadow-inner mb-6`}>
                    <h4 className={`text-xl font-extrabold ${style.text} mb-4 flex items-center`}><span className="text-2xl mr-2">{style.icon}</span> {record.level}</h4>
                    <p className="text-lg font-bold mb-4">スコア: <span className={`${style.scoreText} text-2xl`}>{record.score}</span> / 30</p>
                    <div className="border-t pt-4 border-gray-300/50"><h5 className={`font-bold ${style.text} mb-2`}>当時のアドバイス:</h5><p className="text-gray-800 whitespace-pre-line leading-relaxed">{record.recommendation}</p></div>
                </div>

                <button onClick={onClose} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition">閉じる</button>
            </div>
        </div>
    );
};

// 依存度診断テストモーダル (★共通関数を使用)
const AddictionTestModal = React.memo(({ isOpen, setIsModalOpen, testQuestions, testAnswers, handleAnswerChange, calculateScore, resetTest, testResult, testTotalScore, handleOptionClick, comparisonMessage }: any) => {
    if (!isOpen) return null;
    const answeredCount = testAnswers.filter((s: any) => s !== null && s !== undefined).length;
    const isAllAnswered = answeredCount === testQuestions.length;
    const options = [{ label: "全くない (0点)", score: 0, class: "border-green-400 bg-green-50 text-green-700 hover:bg-green-100" }, { label: "たまにある (1点)", score: 1, class: "border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100" }, { label: "よくある (2点)", score: 2, class: "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100" }, { label: "ほとんどいつも (3点)", score: 3, class: "border-red-400 bg-red-50 text-red-700 hover:bg-red-100" }];

    // スタイル取得 (共通関数)
    const style = testResult ? getResultStyle(testResult.level) : null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl p-6 md:p-8 relative overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                <h3 className="font-extrabold text-indigo-700 text-3xl mb-4 border-b pb-2 flex items-center"><span className="text-4xl mr-2">📱</span> スマートフォン依存度 診断テスト</h3>
                {testResult && style ? (
                    <div className={`mt-8 p-6 ${style.bg} border-2 ${style.border} rounded-xl shadow-inner animate-fade-in`}>
                        <h4 className={`text-2xl font-extrabold ${style.text} mb-4 flex items-center`}><span className="text-3xl mr-2">{style.icon}</span> 診断結果</h4>
                        {comparisonMessage && <div className="mb-6 p-4 bg-white rounded-lg border-l-4 border-indigo-500 shadow-sm"><p className="font-bold text-indigo-800 flex items-start"><span className="mr-2 text-xl">💬</span>{comparisonMessage}</p></div>}
                        <p className="text-xl font-bold mb-2">判定レベル: <span className={`${style.scoreText} text-3xl`}>{testResult.level}</span></p>
                        <p className="text-lg font-bold mb-4">合計スコア: <span className={`${style.scoreText} text-2xl`}>{testTotalScore}点</span></p>
                        <div className="border-t pt-4 border-gray-300/50"><h5 className={`font-bold ${style.text} mb-2`}>おすすめの行動指針:</h5><p className="text-gray-800 whitespace-pre-line leading-relaxed">{testResult.recommendation}</p></div>
                        <div className="flex justify-end space-x-3 mt-6"><button onClick={resetTest} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition shadow-sm">再診断する</button><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md">閉じる</button></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {testQuestions.map((question: string, index: number) => (
                            <div key={index} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                                <p className="font-bold text-gray-800 mb-3">Q{index + 1}. {question}</p>
                                <div className="flex flex-wrap gap-3">{options.map((option) => (<label key={option.score} className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition duration-150 ease-in-out text-sm font-semibold ${option.class} ${testAnswers[index] === option.score ? 'ring-4 ring-offset-2' : ''}`} onClick={handleOptionClick}><input type="radio" name={`question-${index}`} value={option.score} checked={testAnswers[index] === option.score} onChange={() => handleAnswerChange(index, option.score)} className="sr-only" /><span className="ml-0 text-center">{option.label}</span></label>))}</div>
                            </div>
                        ))}
                        <div className="flex justify-end space-x-3 pt-4"><button onClick={calculateScore} disabled={!isAllAnswered} className={`px-8 py-3 font-bold rounded-lg transition transform hover:scale-[1.01] shadow-lg ${isAllAnswered ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>診断する ({answeredCount} / {testQuestions.length}問回答済み)</button></div>
                    </div>
                )}
            </div>
        </div>
    );
});
AddictionTestModal.displayName = 'AddictionTestModal';

// ===============================================
// ユーザー設定モーダル (編集・削除)
// ===============================================

const UserSettingsModal = ({ isOpen, onClose, user, onUpdateUser, onDeleteUser }: any) => {
    const [name, setName] = useState(user.name);
    const [avatar, setAvatar] = useState(user.avatar);
    const [pin, setPin] = useState(user.pin); // PIN編集機能追加

    useEffect(() => {
        if(isOpen) { 
            setName(user.name); 
            setAvatar(user.avatar); 
            setPin(user.pin); // PIN初期化
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name.trim()) return alert('名前を入力してください');
        if (pin.length !== 4) return alert('暗証番号は4桁で入力してください'); // バリデーション
        onUpdateUser(user.id, name, avatar, pin); 
        onClose();
    };

    const handleDelete = () => {
        if (!confirm('本当にアカウントを削除しますか？\nこの操作は取り消せません。')) return;
        onDeleteUser(user.id);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[80]" onClick={onClose}>
            <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-lg text-gray-800 mb-6 text-center">プロフィール設定</h3>
                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-600 mb-2">アイコン</label>
                    <div className="flex flex-wrap gap-2 justify-center mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
                        {AVATAR_OPTIONS.map(emoji => (
                            <button key={emoji} onClick={() => setAvatar(emoji)} className={`w-10 h-10 text-2xl rounded-full transition ${avatar === emoji ? 'bg-indigo-100 border-2 border-indigo-500 scale-110' : 'hover:bg-gray-200'}`}>{emoji}</button>
                        ))}
                    </div>
                    
                    <label className="block text-sm font-bold text-gray-600 mb-2">名前</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-4" />
                    
                    {/* 暗証番号変更欄 */}
                    <label className="block text-sm font-bold text-gray-600 mb-2">暗証番号 (4桁)</label>
                    <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none tracking-widest text-center text-xl font-bold" />
                </div>
                <div className="space-y-3">
                    <button onClick={handleSave} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition">変更を保存</button>
                    <button onClick={handleDelete} className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition border border-red-200">アカウントを削除</button>
                    <button onClick={onClose} className="w-full py-3 text-gray-500 font-bold hover:text-gray-700 transition">キャンセル</button>
                </div>
            </div>
        </div>
    );
};

// ===============================================
// ユーザー選択・作成コンポーネント
// ===============================================

const UserSelectionScreen = ({ users, onSelectUser, onCreateUser }: { users: User[], onSelectUser: (user: User) => void, onCreateUser: (name: string, avatar: string, pin: string) => void }) => {
    const [mode, setMode] = useState<'select' | 'create' | 'login'>('select');
    const [loginUser, setLoginUser] = useState<User | null>(null);
    const [inputName, setInputName] = useState('');
    const [inputAvatar, setInputAvatar] = useState('🐶');
    const [inputPin, setInputPin] = useState('');

    // 作成モード開始
    const handleStartCreate = () => {
        setInputName(''); setInputAvatar('🐶'); setInputPin(''); setMode('create');
    };

    // ログインモード開始
    const handleStartLogin = (user: User) => {
        setLoginUser(user); setInputPin(''); setMode('login');
    };

    // 作成処理
    const handleCreate = () => {
        if (!inputName.trim()) return alert('名前を入力してください');
        if (inputPin.length !== 4) return alert('暗証番号は4桁で入力してください');
        onCreateUser(inputName, inputAvatar, inputPin);
        setMode('select');
    };

    // ログイン処理
    const handleLogin = () => {
        if (!loginUser) return;
        if (inputPin === loginUser.pin) {
            onSelectUser(loginUser);
        } else {
            alert('暗証番号が違います');
            setInputPin('');
        }
    };

    if (mode === 'create') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white max-w-md w-full p-8 rounded-xl shadow-lg animate-fade-in">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">新しいユーザーを作成</h2>
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-600 mb-2">アイコンを選択</label>
                        <div className="flex flex-wrap gap-2 justify-center mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
                            {AVATAR_OPTIONS.map(emoji => (<button key={emoji} onClick={() => setInputAvatar(emoji)} className={`w-10 h-10 text-2xl rounded-full transition ${inputAvatar === emoji ? 'bg-indigo-100 border-2 border-indigo-500 scale-110' : 'hover:bg-gray-200'}`}>{emoji}</button>))}
                        </div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">名前</label>
                        <input type="text" value={inputName} onChange={(e) => setInputName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-4" placeholder="例: たろう" />
                        <label className="block text-sm font-bold text-gray-600 mb-2">暗証番号 (4桁)</label>
                        <input type="password" inputMode="numeric" maxLength={4} value={inputPin} onChange={(e) => setInputPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none tracking-widest text-center text-xl font-bold" placeholder="0000" />
                    </div>
                    <div className="flex gap-3"><button onClick={() => setMode('select')} className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition">キャンセル</button><button onClick={handleCreate} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition">作成する</button></div>
                </div>
            </div>
        );
    }

    if (mode === 'login' && loginUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white max-w-sm w-full p-8 rounded-xl shadow-lg animate-fade-in text-center">
                    <div className="text-6xl mb-4">{loginUser.avatar}</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-6">{loginUser.name} さんの<br/>暗証番号を入力</h2>
                    <input type="password" inputMode="numeric" maxLength={4} value={inputPin} onChange={(e) => setInputPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none tracking-widest text-center text-3xl font-bold mb-6" placeholder="****" autoFocus />
                    <div className="flex gap-3"><button onClick={() => setMode('select')} className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition">戻る</button><button onClick={handleLogin} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition">ログイン</button></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-indigo-700 mb-2 tracking-tight">Digital Wellbeing</h1>
                <p className="text-gray-500">誰が使いますか？</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-2xl w-full">
                {users.map(user => (
                    <button key={user.id} onClick={() => handleStartLogin(user)} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition flex flex-col items-center border border-gray-100">
                        <div className="text-5xl mb-3 bg-indigo-50 w-20 h-20 flex items-center justify-center rounded-full">{user.avatar}</div>
                        <span className="font-bold text-gray-700 truncate w-full text-center">{user.name}</span>
                    </button>
                ))}
                <button onClick={handleStartCreate} className="bg-gray-100 border-2 border-dashed border-gray-300 p-6 rounded-xl hover:bg-white hover:border-indigo-300 hover:text-indigo-600 transition flex flex-col items-center justify-center group">
                    <div className="text-4xl mb-3 text-gray-400 group-hover:text-indigo-500">+</div>
                    <span className="font-bold text-gray-500 group-hover:text-indigo-600">追加する</span>
                </button>
            </div>
        </div>
    );
};

// ===============================================
// メインコンテンツ (ログイン後)
// ===============================================

const MainContent = ({ currentUser, onLogout, onUpdateUser, onDeleteUser, chartjsConstructor, isChartJsLoaded }: any) => {
    const [activeTab, setActiveTab] = useState('diagnosis');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // State (User Specific)
    const [testAnswers, setTestAnswers] = useState<number[]>(initialTestAnswers);
    const [testTotalScore, setTestTotalScore] = useState<number | null>(initialTestScore);
    const [testResult, setTestResult] = useState<{ level: string, recommendation: string } | null>(initialTestResult);
    const [testHistory, setTestHistory] = useState<TestHistoryRecord[]>([]);
    
    // データロード完了フラグ
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    
    // Shared State
    const [appStats, setAppStats] = useState<AppStat[]>(initialAppStats);

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [comparisonMessage, setComparisonMessage] = useState<string | null>(null);
    const [historyFilter, setHistoryFilter] = useState<'10' | 'all'>('10');
    const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<TestHistoryRecord | null>(null);
    const [isHistoryDetailOpen, setIsHistoryDetailOpen] = useState(false);
    const [isSurveyOpen, setIsSurveyOpen] = useState(false);
    const [surveyTargetApp, setSurveyTargetApp] = useState<AppStat | null>(null);

    // Load Data
    useEffect(() => {
        setTestAnswers(loadFromLocalStorage(KEY_ANSWERS, initialTestAnswers, currentUser.id));
        setTestTotalScore(loadFromLocalStorage(KEY_SCORE, initialTestScore, currentUser.id));
        setTestResult(loadFromLocalStorage(KEY_RESULT, initialTestResult, currentUser.id));
        setTestHistory(loadFromLocalStorage(KEY_HISTORY, [], currentUser.id));
        setActiveTab(loadFromLocalStorage(KEY_ACTIVE_TAB, 'diagnosis', currentUser.id)); // タブ復元
        setIsDataLoaded(true); // ロード完了を通知
    }, [currentUser.id]);

    useEffect(() => { setAppStats(loadFromLocalStorage(KEY_APP_STATS, initialAppStats)); }, []);

    // Save Data (ロード完了後のみ保存)
    useEffect(() => { if (isDataLoaded) saveToLocalStorage(KEY_ANSWERS, testAnswers, currentUser.id); }, [testAnswers, currentUser.id, isDataLoaded]);
    useEffect(() => { if (isDataLoaded) saveToLocalStorage(KEY_SCORE, testTotalScore, currentUser.id); }, [testTotalScore, currentUser.id, isDataLoaded]);
    useEffect(() => { if (isDataLoaded) saveToLocalStorage(KEY_RESULT, testResult, currentUser.id); }, [testResult, currentUser.id, isDataLoaded]);
    useEffect(() => { if (isDataLoaded) saveToLocalStorage(KEY_HISTORY, testHistory, currentUser.id); }, [testHistory, currentUser.id, isDataLoaded]);
    useEffect(() => { if (isDataLoaded) saveToLocalStorage(KEY_ACTIVE_TAB, activeTab, currentUser.id); }, [activeTab, currentUser.id, isDataLoaded]); // タブ保存
    useEffect(() => { saveToLocalStorage(KEY_APP_STATS, appStats); }, [appStats]);

    useEffect(() => { window.scrollTo(0, 0); }, [activeTab]);

    // Handlers
    const handleAnswerChange = (qIndex: number, score: number) => setTestAnswers(prev => { const n = [...prev]; n[qIndex] = score; return n; });
    const handleOptionClick = (e: React.MouseEvent) => e.stopPropagation();
    const calculateScore = () => {
        const total = testAnswers.reduce((sum, s) => sum + (s ?? 0), 0);
        setTestTotalScore(total);
        const { level, recommendation } = getResultFromScore(total);
        setTestResult({ level, recommendation });
        let msg = "";
        if (testHistory.length > 0) {
            const prevScore = testHistory[0].score;
            if (total < prevScore) msg = IMPROVEMENT_MESSAGES[Math.floor(Math.random() * IMPROVEMENT_MESSAGES.length)];
            else if (total > prevScore) msg = WORSENING_MESSAGES[Math.floor(Math.random() * WORSENING_MESSAGES.length)];
            else msg = SAME_SCORE_MESSAGES[Math.floor(Math.random() * SAME_SCORE_MESSAGES.length)];
        }
        setComparisonMessage(msg);
        const newRecord = { id: Date.now(), date: formatDate(new Date()), score: total, level, recommendation };
        setTestHistory(prev => [newRecord, ...prev]);
    };
    const resetTest = () => { setTestAnswers(new Array(testQuestions.length).fill(null)); setTestTotalScore(null); setTestResult(null); setComparisonMessage(null); };
    
    // 履歴個別削除処理
    const handleDeleteHistoryItem = (e: React.MouseEvent, recordId: number) => {
        e.stopPropagation();
        if (!confirm('この履歴を削除しますか？')) return;
        setTestHistory(prev => prev.filter(item => item.id !== recordId));
    };

    const clearHistory = () => { if (confirm('履歴をすべて削除しますか？')) setTestHistory([]); };
    const openHistoryDetail = (record: TestHistoryRecord) => { setSelectedHistoryRecord(record); setIsHistoryDetailOpen(true); };
    const openSurvey = (app: AppStat) => { setSurveyTargetApp(app); setIsSurveyOpen(true); };
    const handleSurveySubmit = (appId: string, isSuccess: boolean, userRatings: any) => {
        setAppStats(prevStats => prevStats.map(app => {
            if (app.id !== appId) return app;
            const newTotalVotes = app.totalVotes + 1;
            const currentSuccessCount = Math.round(app.successRate * app.totalVotes / 100);
            const newSuccessRate = Math.round(((currentSuccessCount + (isSuccess ? 1 : 0)) / newTotalVotes) * 100);
            const weight = 5; 
            const updateRating = (current: number, input: number) => parseFloat((((current * app.totalVotes) + (input * weight)) / (app.totalVotes + weight)).toFixed(1));
            return {
                ...app, successRate: newSuccessRate, totalVotes: newTotalVotes,
                ratings: { effectiveness: updateRating(app.ratings.effectiveness, userRatings.effectiveness), fun: updateRating(app.ratings.fun, userRatings.fun), ease: updateRating(app.ratings.ease, userRatings.ease), continuity: updateRating(app.ratings.continuity, userRatings.continuity), design: updateRating(app.ratings.design, userRatings.design) }
            };
        }));
        alert('投票ありがとうございました！グラフが更新されました。');
    };

    const handleUserDelete = (userId: string) => {
        onDeleteUser(userId);
        onLogout(); // アカウント削除後はログアウト
    };

    const renderContent = () => {
        const displayHistory = historyFilter === '10' ? testHistory.slice(0, 10) : testHistory;
        switch (activeTab) {
            case 'diagnosis':
                return (
                    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pt-10">
                        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
                            <div className="text-6xl mb-4">🍀</div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">依存度チェック</h2>
                            <p className="text-gray-600 mb-8 leading-relaxed">{currentUser.name}さん、こんにちは。<br/>あなたのスマートフォンの利用状況を客観的に見直してみませんか？<br/>簡単な10個の質問に答えるだけで、依存度レベルとアドバイスを確認できます。</p>
                            <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-full shadow-lg transition transform hover:scale-105">診断テストをはじめる</button>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100"><h3 className="text-lg font-bold text-gray-700 flex items-center"><span className="mr-2">📋</span> 過去の履歴</h3><div className="flex space-x-2 bg-gray-100 p-1 rounded-lg"><button onClick={() => setHistoryFilter('10')} className={`px-3 py-1 rounded-md text-xs font-bold transition ${historyFilter === '10' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>最新10件</button><button onClick={() => setHistoryFilter('all')} className={`px-3 py-1 rounded-md text-xs font-bold transition ${historyFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>すべて</button></div></div>
                            {displayHistory.length === 0 ? <div className="text-center py-8 text-gray-400"><p className="text-sm">まだ履歴がありません。<br/>テストを受けるとここに記録されます。</p></div> : <div className="space-y-3">{displayHistory.map((record) => (
                                <div key={record.id} onClick={() => openHistoryDetail(record)} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm cursor-pointer hover:bg-indigo-50 transition border-l-4 hover:border-l-indigo-500 group">
                                    <div className="font-semibold text-gray-600 pl-1">{record.date}</div>
                                    <div className="flex items-center space-x-3">
                                        <div className="text-gray-500 hidden sm:block">スコア: <span className="font-bold text-gray-800">{record.score}</span></div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${record.level === '重度依存' ? 'bg-red-50 text-red-700 border-red-200' : record.level === '中度依存' ? 'bg-orange-50 text-orange-700 border-orange-200' : record.level === '軽度依存' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{record.level}</div>
                                        <button onClick={(e) => handleDeleteHistoryItem(e, record.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition" title="この履歴を削除">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                        <div className="text-gray-300 group-hover:text-indigo-400 transition"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></div>
                                    </div>
                                </div>
                            ))}</div>}
                            {testHistory.length > 0 && <div className="mt-4 pt-4 border-t border-gray-100 text-right"><button onClick={clearHistory} className="text-xs text-gray-400 hover:text-red-500 transition underline">すべての履歴を削除する</button></div>}
                        </div>
                    </div>
                );
            case 'personalize':
                return (
                    <PersonalizeSection currentUser={currentUser} appStats={appStats} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} onOpenSurvey={openSurvey} />
                );
            case 'resources':
                return (
                    <div className="max-w-4xl mx-auto animate-fade-in">
                        <h2 className="text-2xl font-bold text-gray-700 mb-6 flex items-center"><span className="mr-2">📚</span> お役立ちリソース & ユーザー評価</h2>
                        <ResourceSection appStats={appStats} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} onOpenSurvey={openSurvey} />
                    </div>
                );
            case 'knowledge':
                return (
                    <div className="max-w-4xl mx-auto animate-fade-in">
                        <h2 className="text-2xl font-bold text-gray-700 mb-6 flex items-center"><span className="mr-2">🧠</span> 脳科学・知識・相談</h2>
                        <KnowledgeSection />
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-24">
            <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-lg sticky top-0 z-40">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Digital Wellbeing</h1>
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm mr-2">
                            <span className="text-xl">{currentUser.avatar}</span>
                            <span className="font-bold text-sm hidden md:inline">{currentUser.name}</span>
                        </div>
                        {/* 設定ボタン */}
                        <button onClick={() => setIsSettingsOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition" title="設定"><span className="text-sm">⚙️</span></button>
                        {/* ログアウトボタン */}
                        <button onClick={onLogout} className="text-xs bg-white text-indigo-600 px-3 py-2 rounded font-bold hover:bg-gray-100 transition shadow">ログアウト</button>
                    </div>
                </div>
            </header>
            <main className="max-w-5xl mx-auto p-4 md:p-6">{renderContent()}</main>
            <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg z-40 pb-safe">
                <div className="max-w-5xl mx-auto flex justify-around items-center">
                    {[
                        { id: 'diagnosis', label: '診断', icon: '🩺' }, 
                        { id: 'personalize', label: 'タイプ診断', icon: '🔍' }, 
                        { id: 'resources', label: 'ガイド', icon: '📚' },
                        { id: 'knowledge', label: '知識', icon: '🧠' }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center w-full py-3 transition ${activeTab === tab.id ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}>
                            <span className="text-2xl mb-1">{tab.icon}</span><span className="text-xs font-bold">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
            <AddictionTestModal isOpen={isModalOpen} setIsModalOpen={setIsModalOpen} testQuestions={testQuestions} testAnswers={testAnswers} handleAnswerChange={handleAnswerChange} calculateScore={calculateScore} resetTest={resetTest} testResult={testResult} testTotalScore={testTotalScore} handleOptionClick={handleOptionClick} comparisonMessage={comparisonMessage} />
            <HistoryDetailModal isOpen={isHistoryDetailOpen} onClose={() => setIsHistoryDetailOpen(false)} record={selectedHistoryRecord} />
            <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} app={surveyTargetApp} onSubmit={handleSurveySubmit} />
            <UserSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={currentUser} onUpdateUser={onUpdateUser} onDeleteUser={handleUserDelete} />
        </div>
    );
};

// ===============================================
// Root Component
// ===============================================

const DigitalWellbeingApp: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isChartJsLoaded, setIsChartJsLoaded] = useState(false);
    const [isAppLoading, setIsAppLoading] = useState(true); // アプリ初期化ロード状態
    const chartjsConstructorRef = useRef<ChartConstructor | null>(null);

    // Load Chart.js (Once)
    useEffect(() => {
        if (isChartJsLoaded) return;
        const cdnUrl = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
        const script = document.createElement('script');
        script.src = cdnUrl;
        script.async = true;
        script.onload = () => {
            // @ts-ignore
            if (window.Chart) { chartjsConstructorRef.current = window.Chart; setIsChartJsLoaded(true); }
        };
        document.head.appendChild(script);
        return () => { document.head.removeChild(script); };
    }, [isChartJsLoaded]);

    // Load Users & Auto Login (★ここが修正箇所です)
    useEffect(() => {
        const initApp = () => {
            const loadedUsers = loadFromLocalStorage(KEY_USERS, []);
            setUsers(loadedUsers);

            // 自動ログイン処理
            const lastUserId = loadFromLocalStorage<string | null>(KEY_LAST_USER_ID, null);
            if (lastUserId && loadedUsers.length > 0) {
                const targetUser = loadedUsers.find((u: User) => u.id === lastUserId);
                if (targetUser) {
                    setCurrentUser(targetUser);
                }
            }
            setIsAppLoading(false); // 初期化完了
        };
        initApp();
    }, []);

    // Save Users
    useEffect(() => {
        saveToLocalStorage(KEY_USERS, users);
    }, [users]);

    const handleCreateUser = (name: string, avatar: string, pin: string) => {
        const newUser: User = { id: Date.now().toString(), name, avatar, pin };
        setUsers([...users, newUser]);
        // 作成後はログイン画面ではなく、一度選択画面に戻す（仕様として自然なため）
    };

    const handleDeleteUser = (userId: string) => {
        const newUsers = users.filter(u => u.id !== userId);
        setUsers(newUsers);
        const keysToRemove = [KEY_ANSWERS, KEY_SCORE, KEY_RESULT, KEY_HISTORY, KEY_TYPE_RESULT, KEY_ACTIVE_TAB];
        keysToRemove.forEach(key => { localStorage.removeItem(getUserKey(key, userId)); });
    };

    const handleUpdateUser = (id: string, name: string, avatar: string, pin: string) => {
        const updatedUsers = users.map(user => 
            user.id === id ? { ...user, name, avatar, pin } : user
        );
        setUsers(updatedUsers);
        if (currentUser && currentUser.id === id) {
            setCurrentUser({ ...currentUser, name, avatar, pin });
        }
    };

    // ログイン処理 (★修正: 手動ログイン時は必ず「診断」タブにリセットして保存)
    const handleLoginUser = (user: User) => {
        // 1. ユーザーのタブ情報を強制的に 'diagnosis' にリセット保存
        saveToLocalStorage(KEY_ACTIVE_TAB, 'diagnosis', user.id);
        // 2. その後でログイン状態にする（MainContentがマウントされるときに↑を読み込む）
        setCurrentUser(user);
        saveToLocalStorage(KEY_LAST_USER_ID, user.id);
    };

    // ログアウト処理 (★修正: ログイン状態を削除)
    const handleLogoutUser = () => {
        setCurrentUser(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(KEY_LAST_USER_ID); 
        }
    };

    if (isAppLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400 font-bold">Loading...</div>;
    }

    if (!currentUser) {
        return <UserSelectionScreen users={users} onSelectUser={handleLoginUser} onCreateUser={handleCreateUser} />;
    }

    return (
        <MainContent 
            currentUser={currentUser} 
            onLogout={handleLogoutUser} 
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            chartjsConstructor={chartjsConstructorRef.current} 
            isChartJsLoaded={isChartJsLoaded} 
        />
    );
};

export default DigitalWellbeingApp;