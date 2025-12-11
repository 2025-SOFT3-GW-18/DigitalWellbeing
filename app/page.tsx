
"use client";
import React, { useState, useEffect, useRef } from "react";

/* ===============================================
 1. 型定義・インターフェース
=============================================== */
interface User {
  id: string;
  name: string;
  password: string;
  icon: string;
}
type ChartConstructor = any;
type ChartInstance = any;

interface TestHistoryRecord {
  id: number;
  date: string;
  score: number;
  level: string;
  recommendation: string;
  comparisonMessage?: string;
}

interface PendingResult {
  date: string;
  score: number;
  level: string;
  recommendation: string;
  comparisonMessage?: string;
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
  _agg?: {
    successCount: number;
    ratingSums: {
      effectiveness: number;
      fun: number;
      ease: number;
      continuity: number;
      design: number;
    };
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

interface UserAppRating {
  isSuccess: boolean;
  ratings: {
    effectiveness: number;
    fun: number;
    ease: number;
    continuity: number;
    design: number;
  };
  updatedAt: string;
}
type UserRatingsMap = { [appId: string]: UserAppRating };

/* ===============================================
 2. 定数定義
=============================================== */
const USER_ICONS = [
  "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐯","🦁","🐮","🐷","🐵","🐺","🐻‍❄️","🐨"
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
  "前回よりも依存度が下がっています。リアルの時間を大切に！✨",
];
const WORSENING_MESSAGES = [
  "前回よりスコアが上がってしまいました。深呼吸しましょう。🌳",
  "注意信号です。知らず知らずのうちに利用時間が増えていませんか？☕",
  "疲れが溜まっているかもしれません。目を閉じてリラックスしましょう。😌",
  "油断は禁物です。物理的にスマホを遠ざける工夫をしてみましょう。🔕",
  "リフレッシュが必要です！少しの間、デジタル機器から離れましょう。🌳",
];
const SAME_SCORE_MESSAGES = [
  "前回と同じスコアです。現状を維持できていますね。⚖️",
  "変化はありません。油断すると増えてしまうので注意です。👀",
];

const ADDICTION_TYPES: { [key: string]: AddictionType } = {
  sns: {
    id: "sns",
    name: "SNS・承認欲求タイプ",
    icon: "🐰",
    description: "「いいね」や返信が気になり、常に誰かと繋がっていないと不安になるタイプです。",
    advice: "通知を完全にオフにする時間を設けるか、強制的にアプリをロックするツールが有効です。",
    recommendedCategories: ["lock"],
    recommendedAppIds: ["detox", "stayfree"],
  },
  game: {
    id: "game",
    name: "ゲーム・没頭タイプ",
    icon: "🎮",
    description: "現実逃避や達成感を求めて、長時間ゲームや動画に没頭してしまうタイプです。",
    advice: "「やめる」こと自体をゲーム化できるアプリや、育成要素のあるツールで置き換えましょう。",
    recommendedCategories: ["gamification"],
    recommendedAppIds: ["forest", "focus_quest"],
  },
  habit: {
    id: "habit",
    name: "無意識・習慣タイプ",
    icon: "👻",
    description: "目的がないのに、手持ち無沙汰で無意識にスマホを触ってしまうタイプです。",
    advice: "触った瞬間に「気づき」を与えるアプリや、利用時間の可視化ツールがおすすめです。",
    recommendedCategories: ["gamification", "lock"],
    recommendedAppIds: ["fish", "ubhind", "stop"],
  },
  work: {
    id: "work",
    name: "仕事・強迫観念タイプ",
    icon: "💼",
    description: "休日や夜間でも仕事の連絡やニュースが気になり、脳が休まらないタイプです。",
    advice: "時間帯で区切って利用制限する機能や、ペアレンタルコントロールの自己適用が有効です。",
    recommendedCategories: ["family", "lock"],
    recommendedAppIds: ["screentime", "detox"],
  },
};

const PERSONALIZE_QUESTIONS = [
  {
    id: 1,
    text: "スマホを手に取る「一番多い理由」は？",
    options: [
      { label: "SNSの通知やタイムラインの確認", type: "sns" },
      { label: "ゲームや動画視聴での暇つぶし", type: "game" },
      { label: "特に理由はないが手持ち無沙汰で", type: "habit" },
      { label: "仕事のメールやニュースチェック", type: "work" },
    ],
  },
  {
    id: 2,
    text: "スマホがないと、どんな気分になりますか？",
    options: [
      { label: "誰からも連絡が来ないか不安", type: "sns" },
      { label: "退屈でつまらない", type: "game" },
      { label: "なんとなくソワソワする", type: "habit" },
      { label: "重要な情報を見逃しそうで怖い", type: "work" },
    ],
  },
  {
    id: 3,
    text: "もし対策アプリを入れるなら？",
    options: [
      { label: "強制的に使えなくしてほしい", type: "sns" },
      { label: "楽しみながら減らしたい", type: "game" },
      { label: "使いすぎた時だけ教えてほしい", type: "habit" },
      { label: "時間帯できっちり分けたい", type: "work" },
    ],
  },
];

const initialAppStats: AppStat[] = [
  { id: "forest", name: "Forest", category: "gamification", icon: "🌲", desc: "集中時間に応じて「木」を育て、失敗すると枯れる。", url: "https://www.google.com/search?q=スマホアプリ+Forest", successRate: 85, totalVotes: 1240, ratings: { effectiveness: 4.5, fun: 4.8, ease: 4.0, continuity: 4.2, design: 5.0 } },
  { id: "focus_quest", name: "Focus Quest", category: "gamification", icon: "🗺️", desc: "集中時間を「冒険」に見立て、目標達成でヒーローを育成。", url: "https://www.google.com/search?q=スマホアプリ+Focus+Quest", successRate: 78, totalVotes: 530, ratings: { effectiveness: 4.0, fun: 5.0, ease: 3.5, continuity: 4.5, design: 4.2 } },
  { id: "fish", name: "スマホをやめれば魚が育つ", category: "gamification", icon: "🐟", desc: "スマホを置くことで、かわいい「魚」が水槽で成長。", url: "https://www.google.com/search?q=スマホアプリ+スマホをやめれば魚が育つ", successRate: 82, totalVotes: 320, ratings: { effectiveness: 3.8, fun: 4.2, ease: 5.0, continuity: 3.9, design: 4.0 } },
  { id: "focus_dog", name: "Focus Dog", category: "gamification", icon: "🐶", desc: "集中してドーナツを作り、相棒の犬を喜ばせる。", url: "https://www.google.com/search?q=スマホアプリ+Focus+Dog", successRate: 75, totalVotes: 210, ratings: { effectiveness: 3.5, fun: 4.5, ease: 4.5, continuity: 3.8, design: 4.8 } },
  { id: "detox", name: "Detox", category: "lock", icon: "🔒", desc: "シンプルなタイマー機能で、設定時間、スマホを強制ロック。", url: "https://www.google.com/search?q=スマホアプリ+Detox", successRate: 92, totalVotes: 890, ratings: { effectiveness: 5.0, fun: 2.0, ease: 4.8, continuity: 3.5, design: 3.0 } },
  { id: "ubhind", name: "UBhind", category: "lock", icon: "📊", desc: "利用時間を可視化し、制限時間10分前にアラーム通知。", url: "https://www.google.com/search?q=スマホアプリ+UBhind", successRate: 68, totalVotes: 450, ratings: { effectiveness: 4.2, fun: 3.0, ease: 3.5, continuity: 4.0, design: 3.8 } },
  { id: "stayfree", name: "StayFree", category: "lock", icon: "⏳", desc: "アプリごとの使用時間をトラッキングし、アプリの使用を制限。", url: "https://www.google.com/search?q=スマホアプリ+StayFree", successRate: 74, totalVotes: 600, ratings: { effectiveness: 4.5, fun: 3.5, ease: 4.0, continuity: 4.2, design: 4.5 } },
  { id: "stop", name: "使いすぎストップ", category: "lock", icon: "⛔", desc: "スマホの使用時間管理や制限を簡単に行える。", url: "https://www.google.com/search?q=スマホアプリ+使いすぎストップ", successRate: 70, totalVotes: 300, ratings: { effectiveness: 4.0, fun: 2.5, ease: 4.5, continuity: 3.8, design: 3.5 } },
  { id: "family_link", name: "Google Family Link", category: "family", icon: "🌐", desc: "Google公式。子どもの利用時間をリモート管理。", url: "https://www.google.com/search?q=スマホアプリ+Google+Family+Link", successRate: 88, totalVotes: 1500, ratings: { effectiveness: 4.8, fun: 2.5, ease: 3.5, continuity: 4.8, design: 4.0 } },
  { id: "screentime", name: "スクリーンタイム (iOS)", category: "family", icon: "🍏", desc: "Apple公式。アプリごとの時間制限、休止時間設定。", url: "https://www.google.com/search?q=スマホアプリ+スクリーンタイム+iOS", successRate: 80, totalVotes: 2000, ratings: { effectiveness: 4.5, fun: 3.0, ease: 5.0, continuity: 4.5, design: 4.5 } },
];

/* ===============================================
 3. ストレージキー
=============================================== */
const KEY_USERS = "dw_users";
const KEY_ANSWERS = "dw_testAnswers";
const KEY_SCORE = "dw_testTotalScore";
const KEY_RESULT = "dw_testResult";
const KEY_HISTORY = "dw_testHistory";
const KEY_APP_STATS = "dw_appStats";
const KEY_TYPE_RESULT = "dw_typeResult";
const KEY_LAST_USER_ID = "dw_last_user_id";
const KEY_ACTIVE_TAB = "dw_active_tab";
const KEY_USER_RATINGS = "dw_userRatings";
const KEY_APP_STATS_BACKUP = "dw_appStats_backup";
const SCROLL_KEY_PREFIX = "dw_scroll_";
/* 追加：未ログインの診断結果一時保存キー */
const KEY_PENDING_RESULT = "dw_pending_result";

/* ===============================================
 4. 初期値
=============================================== */
const initialTestAnswers = new Array(testQuestions.length).fill(null);
const initialTestScore: number | null = null;
const initialTestResult: { level: string; recommendation: string } | null = null;

/* ===============================================
 5. ヘルパー
=============================================== */
const getUserKey = (key: string, userId: string) => `${userId}_${key}`;
const loadFromLocalStorage = <T,>(key: string, defaultValue: T, userId?: string): T => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const storageKey = userId ? getUserKey(key, userId) : key;
    const storedValue = localStorage.getItem(storageKey);
    if (storedValue === null || storedValue === "undefined") return defaultValue;
    return JSON.parse(storedValue) as T;
  } catch (error) {
    console.error(`Error loading key ${key} from localStorage:`, error);
    return defaultValue;
  }
};
const saveToLocalStorage = (key: string, value: any, userId?: string) => {
  if (typeof window === "undefined") return;
  try {
    const storageKey = userId ? getUserKey(key, userId) : key;
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving key ${key} to localStorage:`, error);
  }
};
const removeFromLocalStorage = (key: string, userId?: string) => {
  if (typeof window === "undefined") return;
  try {
    const storageKey = userId ? getUserKey(key, userId) : key;
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error(`Error removing key ${key} from localStorage:`, error);
  }
};
const formatDate = (date: Date): string => date.toISOString().slice(0, 10).replace(/\-/g, "/");

const getResultFromScore = (score: number) => {
  let level = "重度依存";
  let recommendation =
    "スマートフォンが生活を支配している可能性があります。\n専門家への相談も検討してください。";
  if (score <= 6) {
    level = "低依存";
    recommendation =
      "健康的な利用習慣が保たれています。\n今のバランスを大切にしてください。";
  } else if (score <= 14) {
    level = "軽度依存";
    recommendation =
      "少し依存の傾向が見られます。\n意識的にデジタルデトックスの時間を設けましょう。";
  } else if (score <= 23) {
    level = "中度依存";
    recommendation =
      "生活に支障が出始めています。\n具体的な対策を直ちに実行しましょう。";
  }
  return { level, recommendation };
};

const getResultStyle = (level: string) => {
  switch (level) {
    case "低依存":
      return { bg: "bg-green-50", border: "border-green-300", text: "text-green-700", scoreText: "text-green-800", icon: "🌳" };
    case "軽度依存":
      return { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700", scoreText: "text-yellow-800", icon: "⚠️" };
    case "中度依存":
      return { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700", scoreText: "text-orange-800", icon: "🔥" };
    case "重度依存":
      return { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", scoreText: "text-red-800", icon: "🚨" };
    default:
      return { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700", scoreText: "text-gray-800", icon: "❓" };
  }
};

/* ===============================================
 ★ パスワード（8～16・半角英数字＋半角記号）
=============================================== */
const PASSWORD_MAX = 16;
const capPassword = (v: string) => v.replace(/[^\x21-\x7E]/g, "").slice(0, PASSWORD_MAX);
const isValidPassword = (v: string) => /^[A-Za-z0-9\x21-\x7E]{8,16}$/.test(v);

/* ===============================================
 6. グラフ・モーダル等のコンポーネント
=============================================== */
const ResourceChart = ({ type, data, options, chartjsConstructor, isChartJsLoaded }: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartInstance | null>(null);

  useEffect(() => {
    if (isChartJsLoaded && chartjsConstructor && canvasRef.current) {
      if (chartInstance.current) chartInstance.current.destroy();
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        chartInstance.current = new chartjsConstructor(ctx, { type, data, options });
      }
    }
    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [data, options, type, chartjsConstructor, isChartJsLoaded]);

  if (!isChartJsLoaded) {
    return (
      <div className="h-32 bg-gray-100 rounded animate-pulse flex items-center justify-center text-xs text-gray-400">
        Loading...
      </div>
    );
  }
  return (
    <div className="relative w-full h-full flex justify-center">
      <canvas ref={canvasRef} />
    </div>
  );
};

const IconPicker = ({ value, onChange }: { value: string; onChange: (icon: string) => void; }) => (
  <div className="w-full overflow-x-hidden overflow-y-auto max-h-40 p-1 rounded-lg bg-white border border-gray-200">
    <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(40px,1fr))]">
      {USER_ICONS.map((ic) => (
        <button
          key={ic}
          type="button"
          onClick={() => onChange(ic)}
          title={ic}
          className={`flex items-center justify-center aspect-square rounded-lg border transition leading-none select-none ${
            value === ic
              ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200"
              : "bg-white border-gray-200 hover:bg-gray-100"
          }`}
        >
          <span className="text-base">{ic}</span>
        </button>
      ))}
    </div>
  </div>
);

/* 背景スクロール停止 */
const useBodyScrollLock = (isOpen: boolean) => {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);
};

/* --- 投票モーダル（二重送信防止） --- */
const SurveyModal = ({ isOpen, onClose, app, onSubmit, onDelete, existingRating }: any) => {
  useBodyScrollLock(!!isOpen);
  const [isSuccess, setIsSuccess] = useState(true);
  const [ratings, setRatings] = useState({ effectiveness: 3, fun: 3, ease: 3, continuity: 3, design: 3 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && app) {
      if (existingRating) {
        setIsSuccess(existingRating.isSuccess);
        setRatings(existingRating.ratings);
      } else {
        setIsSuccess(true);
        setRatings({ effectiveness: 3, fun: 3, ease: 3, continuity: 3, design: 3 });
      }
      setIsSubmitting(false);
    }
  }, [isOpen, app, existingRating]);

  if (!isOpen || !app) return null;

  const handleSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const norm = (n: number) => Math.max(1, Math.min(5, Number(n) || 1));
    const normalized = {
      effectiveness: norm(ratings.effectiveness),
      fun: norm(ratings.fun),
      ease: norm(ratings.ease),
      continuity: norm(ratings.continuity),
      design: norm(ratings.design),
    };
    onSubmit(app.id, isSuccess, normalized);
    onClose();
    setIsSubmitting(false);
  };

  const handleDelete = () => {
    if (!existingRating) return onClose();
    if (confirm("このアプリへのあなたの評価を削除しますか？\n（投票は取り消され、集計から除外されます）")) {
      onDelete(app.id);
      onClose();
    }
  };

  const ratingLabels: Record<string, string> = { effectiveness: "効果", fun: "楽しさ", ease: "手軽さ", continuity: "継続性", design: "デザイン" };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          aria-label="閉じる"
          title="閉じる"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center pr-10">
          <span className="text-2xl mr-2">{app.icon}</span> {app.name} の評価
        </h3>
        <div className="mb-2">
          <p className="text-xs text-gray-400 font-bold">※ このアプリへの評価は「1ユーザーにつき1回」です。あとから編集・削除できます。</p>
        </div>
        <div className="mb-4">
          <p className="font-bold text-sm text-gray-600 mb-2">目標は達成できましたか？</p>
          <div className="flex space-x-2">
            <button onClick={() => setIsSuccess(true)} className={`flex-1 py-2 rounded-lg font-bold border transition ${isSuccess ? "bg-green-100 border-green-400 text-green-800" : "bg-white border-gray-200 text-gray-400"}`}>はい</button>
            <button onClick={() => setIsSuccess(false)} className={`flex-1 py-2 rounded-lg font-bold border transition ${!isSuccess ? "bg-red-100 border-red-400 text-red-800" : "bg-white border-gray-200 text-gray-400"}`}>いいえ</button>
          </div>
        </div>
        <div className="mb-6 space-y-3">
          <p className="font-bold text-sm text-gray-600">詳細評価 (★1-5)</p>
          {Object.keys(ratings).map((key) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-gray-500 font-bold w-16">{ratingLabels[key]}</span>
              <div className="flex space-x-1">
                {[1,2,3,4,5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRatings({ ...ratings, [key]: star })}
                    className={`text-2xl focus:outline-none transition-colors ${star <= (ratings as any)[key] ? "text-yellow-400" : "text-gray-200"}`}
                  >★</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full bg-indigo-600 text-white font-bold py-3 rounded-lg transition ${isSubmitting ? "opacity-60 cursor-not-allowed" : "hover:bg-indigo-700"}`}
        >
          {existingRating ? "評価を更新" : "投票してデータを更新"}
        </button>
        {existingRating && (
          <button onClick={handleDelete} className="w-full mt-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 rounded-lg transition border border-red-200">
            評価を削除
          </button>
        )}
      </div>
    </div>
  );
};

/* --- プロフィールモーダル（アカウント削除） --- */
const ProfileModal = ({
  isOpen, onClose, currentUser, onSubmit, users, onDeleteCurrentUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSubmit: (nextName: string, nextPassword: string, nextIcon: string) => void;
  users: User[];
  onDeleteCurrentUser: () => void;
}) => {
  useBodyScrollLock(!!isOpen);
  const [name, setName] = useState(currentUser?.name ?? "");
  const [password, setPassword] = useState("");
  const [icon, setIcon] = useState<string>(currentUser?.icon ?? USER_ICONS[0]);

  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name);
      setPassword("");
      setIcon(currentUser.icon ?? USER_ICONS[0]);
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const newName = name.trim();
    const newPwInput = password.trim();
    const finalPw = newPwInput === "" ? currentUser.password : newPwInput;
    if (!newName) { alert("ユーザー名を入力してください"); return; }
    if (newName.length > 10) { alert("ユーザー名は10文字以内で入力してください"); return; }
    const dup = users.some(u => u.name === newName && u.id !== currentUser.id);
    if (dup) { alert("そのユーザー名は既に使用されています。別の名前を入力してください。"); return; }
    if (!isValidPassword(finalPw)) {
      alert("パスワードは 8～16 文字の半角英数字＋記号のみです（全角・スペース不可）");
      return;
    }
    if (!icon) { alert("アイコンを選択してください"); return; }
    onSubmit(newName, finalPw, icon);
    onClose();
    alert("アカウント情報を更新しました");
  };

  const handleDeleteAccount = () => {
    if (!currentUser) return;
    const ok = confirm(
      `「${currentUser.name}」のアカウントを削除します。\n` +
      "診断履歴・結果・タイプ・アプリ評価など、あなたのローカルデータはすべて削除されます。\n" +
      "この操作は元に戻せません。よろしいですか？"
    );
    if (!ok) return;
    onDeleteCurrentUser();
    onClose();
    alert("アカウントを削除しました。");
  };

  return (
    <div className="fixed inset-0 bg-gray-900/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200" onClick={onClose} title="閉じる">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <h3 className="text-xl font-extrabold text-gray-800 mb-4 text-center">アカウント設定</h3>

        <form onSubmit={submit}>
          <label className="block text-sm font-bold text-gray-600 mb-2">ユーザー名（10文字以内）</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 10))}
            className="w-full p-3 border border-gray-300 rounded-lg mb-3"
            placeholder="ユーザー名"
            maxLength={10}
          />
          <label className="block text-sm font-bold text-gray-600 mb-2">パスワード（8～16・半角英数字記号）</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(capPassword(e.target.value))}
            maxLength={PASSWORD_MAX}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4"
            placeholder="********"
          />
          <label className="block text-sm font-bold text-gray-600 mb-2">アイコン</label>
          <IconPicker value={icon} onChange={setIcon} />
          <button type="submit" className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition">更新する</button>
        </form>

        <div className="mt-4 pt-4 border-t border-red-200">
          <p className="text-xs text-red-600 font-bold mb-2">⚠️ アカウント削除（復元不可）</p>
          <button
            type="button"
            onClick={handleDeleteAccount}
            className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold transition"
          >
            アカウントを削除する
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- 統合認証モーダル --- */
const UnifiedAuthModal = ({
  isOpen, onClose, onLogin, onRegister, onAdminLogin, onSuccess,
}: {
  isOpen: boolean; onClose: () => void;
  onLogin: (username: string, password: string) => boolean;
  onRegister: (username: string, password: string, icon: string) => boolean;
  onAdminLogin: () => void;
  onSuccess: (mode: "login" | "register") => void;
}) => {
  useBodyScrollLock(!!isOpen);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [icon, setIcon] = useState<string>(USER_ICONS[0]);

  useEffect(() => {
    if (isOpen) { setMode("login"); setUsername(""); setPassword(""); setIcon(USER_ICONS[0]); }
  }, [isOpen]);

  if (!isOpen) return null;

  const submitLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = username.trim();
    if (!name) { alert("ユーザー名を入力してください"); return; }
    if (name.length > 10) { alert("ユーザー名は10文字以内で入力してください"); return; }
    if (name === "admin" && password === "admin") { onAdminLogin(); onClose(); return; }
    const ok = onLogin(name, password);
    if (ok) { onClose(); onSuccess("login"); } else alert("ユーザー名またはパスワードが正しくありません");
  };

  const submitRegister = (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = username.trim(); const pw = capPassword(password);
    if (!name) { alert("ユーザー名を入力してください"); return; }
    if (name.length > 10) { alert("ユーザー名は10文字以内で入力してください"); return; }
    if (!isValidPassword(pw)) { alert("パスワードは 8～16 文字の「半角英数字記号」のみ利用できます（全角・スペース不可）"); return; }
    if (!icon) { alert("アイコンを選択してください"); return; }
    const ok = onRegister(name, pw, icon);
    if (ok) { onClose(); onSuccess("register"); }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200" onClick={onClose} title="閉じる">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        {mode === "login" ? (
          <>
            <h3 className="text-xl font-extrabold text-gray-800 mb-4 text-center">ログイン</h3>
            <form onSubmit={submitLogin}>
              <label className="block text-sm font-bold text-gray-600 mb-2">ユーザー名（10文字以内）</label>
              <input value={username} onChange={(e) => setUsername(e.target.value.slice(0, 10))} className="w-full p-3 border border-gray-300 rounded-lg mb-3" placeholder="ユーザー名" maxLength={10} />
              <label className="block text-sm font-bold text-gray-600 mb-2">パスワード（8～16・半角英数字記号）</label>
              <input type="password" value={password} onChange={(e) => setPassword(capPassword(e.target.value))} maxLength={PASSWORD_MAX} className="w-full p-3 border border-gray-300 rounded-lg mb-4" placeholder="********" />
              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition">ログイン</button>
            </form>
            <p className="mt-3 text-xs text-gray-400 text-center">管理者（admin / admin）もこちらからログインできます</p>
            <div className="mt-3 text-center">
              <span className="text-xs text-gray-500 mr-1">アカウントを作成しませんか？</span>
              <button type="button" onClick={() => { setMode("register"); setPassword(""); }} className="text-xs text-indigo-600 underline hover:text-indigo-700">ユーザー登録へ</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-extrabold text-gray-800 mb-4 text-center">ユーザー登録</h3>
            <form onSubmit={submitRegister}>
              <label className="block text-sm font-bold text-gray-600 mb-2">ユーザー名（10文字以内）</label>
              <input value={username} onChange={(e) => setUsername(e.target.value.slice(0, 10))} className="w-full p-3 border border-gray-300 rounded-lg mb-3" placeholder="ユーザー名" maxLength={10} />
              <label className="block text-sm font-bold text-gray-600 mb-2">パスワード（8～16・半角英数字記号）</label>
              <input type="password" value={password} onChange={(e) => setPassword(capPassword(e.target.value))} maxLength={PASSWORD_MAX} className="w-full p-3 border border-gray-300 rounded-lg mb-3" placeholder="********" />
              <label className="block text-sm font-bold text-gray-600 mb-2">アイコン</label>
              <IconPicker value={icon} onChange={setIcon} />
              <button type="submit" className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition">登録する</button>
            </form>
            <div className="mt-3 text-center">
              <span className="text-xs text-gray-500 mr-1">すでにアカウントをお持ちですか？</span>
              <button type="button" onClick={() => { setMode("login"); setPassword(""); }} className="text-xs text-indigo-600 underline hover:text-indigo-700">ログインへ</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* --- 管理者操作デモ --- */
const AdminActionDemoModal = ({
  isOpen, onClose, mode, users, currentAppStats,
  onExecute, onApplyDemo, onRestore,
}: {
  isOpen: boolean; onClose: () => void;
  mode: "ratings" | "userData";
  users: User[];
  currentAppStats: AppStat[];
  onExecute: () => void; onApplyDemo: () => void; onRestore: () => void;
}) => {
  useBodyScrollLock(!!isOpen);
  const [useDemoPreview, setUseDemoPreview] = useState(false);
  if (!isOpen) return null;

  const generateDemoStats = (apps: AppStat[]) =>
    apps.map(app => {
      const cfg = app.category === "gamification" ? { rate: [65, 90], votes: [500, 2000] }
        : app.category === "lock" ? { rate: [70, 95], votes: [600, 2500] }
        : { rate: [75, 90], votes: [800, 3000] };
      const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
      const avg = () => parseFloat((3 + Math.random() * 2).toFixed(1));
      return {
        ...app,
        successRate: rand(cfg.rate[0], cfg.rate[1]),
        totalVotes: rand(cfg.votes[0], cfg.votes[1]),
        ratings: { effectiveness: avg(), fun: avg(), ease: avg(), continuity: avg(), design: avg() },
      };
    });

  const demoStats = generateDemoStats(currentAppStats);
  const previewStats = useDemoPreview
    ? demoStats
    : currentAppStats.map(app => ({ ...app, successRate: 0, totalVotes: 0, ratings: { effectiveness: 0, fun: 0, ease: 0, continuity: 0, design: 0 }, }));

  const userKeys = [KEY_ANSWERS, KEY_SCORE, KEY_RESULT, KEY_HISTORY, KEY_TYPE_RESULT, KEY_ACTIVE_TAB];
  const confirmExecute = () => {
    if (confirm("全ユーザーの診断履歴・結果・タイプを削除します。よろしいですか？")) onExecute();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition" onClick={onClose} title="閉じる">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        {mode === "ratings" ? (
          <>
            <h3 className="text-xl font-extrabold text-gray-800 mb-4">評価データ初期化（プレビュー）</h3>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {useDemoPreview ? "デモデータでプレビュー表示中" : "実行後（初期化後）のプレビュー表示中"}
              </p>
              <button onClick={() => setUseDemoPreview(v => !v)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded font-bold transition">
                プレビュー切替
              </button>
            </div>
            <div className="max-h-64 overflow-auto border rounded p-3 bg-gray-50">
              {previewStats.map((app) => (
                <div key={app.id} className="text-sm text-gray-700 border-b last:border-b-0 py-2">
                  <div className="flex items-center"><span className="text-xl mr-2">{app.icon}</span><span className="font-bold">{app.name}</span></div>
                  <div className="ml-8 text-xs text-gray-500">
                    成功率: <span className="font-bold">{app.successRate}%</span> ／ 投票: <span className="font-bold">{app.totalVotes}</span>件 ／
                    評価(平均): <span className="font-bold">
                      {app.ratings.effectiveness.toFixed(1)},{app.ratings.fun.toFixed(1)},{app.ratings.ease.toFixed(1)},{app.ratings.continuity.toFixed(1)},{app.ratings.design.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={onApplyDemo} className="py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-lg font-bold">デモとして適用</button>
              <button onClick={onRestore} className="py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold">
                元に戻す（0件へ初期化）
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-extrabold text-gray-800 mb-4">全ユーザーデータ削除（プレビュー）</h3>
            <p className="text-sm text-gray-600 mb-3">実行後、各ユーザーの以下のキーが削除されます。</p>
            <div className="max-h-64 overflow-auto border rounded p-3 bg-gray-50">
              {users.length === 0 ? (
                <p className="text-sm text-gray-400">ユーザーがいません。</p>
              ) : users.map((u) => (
                <div key={u.id} className="border-b last:border-b-0 py-2">
                  <p className="text-sm text-gray-800 font-bold">{u.name} <span className="text-xs text-gray-400">ID: {u.id}</span></p>
                  <ul className="ml-4 list-disc text-xs text-gray-600">
                    {userKeys.map((k) => (<li key={k}><code className="bg-white px-1 rounded">{`${u.id}_${k}`}</code></li>))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button
                onClick={confirmExecute}
                className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold"
              >
                すべてのユーザーデータを削除する
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* --- アプリカード --- */
const AppCard = ({ app, chartjsConstructor, isChartJsLoaded, onOpenSurvey }: any) => {
  const pieData = { labels: ["成功", "失敗"], datasets: [{ data: [app.successRate, 100 - app.successRate], backgroundColor: ["#4ade80", "#e5e7eb"], borderWidth: 0 }] };
  const pieOptions = { plugins: { legend: { display: false }, tooltip: { enabled: false } }, maintainAspectRatio: false };
  const radarData = {
    labels: ["効果", "楽しさ", "手軽さ", "継続性", "デザイン"],
    datasets: [{
      label: "評価",
      data: [app.ratings.effectiveness, app.ratings.fun, app.ratings.ease, app.ratings.continuity, app.ratings.design],
      backgroundColor: "rgba(99, 102, 241, 0.2)",
      borderColor: "rgba(99, 102, 241, 1)",
      borderWidth: 1,
      pointBackgroundColor: "rgba(99, 102, 241, 1)",
      pointRadius: 1
    }]
  };
  const radarOptions= { plugins: { legend: { display: false } }, scales: { r: { min: 0, max: 5, ticks: { display: false, stepSize: 1 }, pointLabels: { display: true, font: { size: 9 }, color: "#4b5563" } } }, maintainAspectRatio: false };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 mb-4">
      <div className="flex-1">
        <div className="flex items-center mb-2">
          <span className="text-3xl mr-3">{app.icon}</span>
          <div>
            <h4 className="font-bold text-lg text-gray-800 leading-tight">{app.name}</h4>
            <p className="text-xs text-gray-500">{app.totalVotes}件の評価</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-3 min-h-[40px]">{app.desc}</p>
        <div className="flex gap-2">
          <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-bold transition">検索する 🔍</a>
          <button onClick={() => onOpenSurvey(app)} className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg font-bold transition">投票する 🗳️</button>
        </div>
      </div>

      <div className="flex gap-2 h-48 md:w-96 shrink-0">
        <div className="w-2/5 relative flex flex-col items-center justify-center">
          <p className="text-[10px] text-gray-400 font-bold mb-1">目標達成率</p>
          <div className="relative w-full flex-1 min-h-0">
            <ResourceChart type="doughnut" data={pieData} options={pieOptions} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-600">{app.successRate}%</div>
          </div>
        </div>
        <div className="w-3/5 relative flex flex-col items-center">
          <p className="text-[10px] text-gray-400 font-bold mb-1">特徴分析</p>
          <div className="w-full flex-1 min-h-0">
            <ResourceChart type="radar" data={radarData} options={radarOptions} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ResourceSection = ({ appStats, chartjsConstructor, isChartJsLoaded, onOpenSurvey }: any) => (
  <div className="space-y-8">
    <div className="bg-green-50 border-green-200 border rounded-xl p-4 md:p-6 shadow-sm">
      <h3 className="font-bold text-green-800 text-xl mb-2 flex items-center"><span className="mr-2">🎮</span> 1. 集中力ゲーム・育成系</h3>
      <div className="space-y-3">
        {appStats.filter((a: any) => a.category === "gamification").map((app: any) => (
          <AppCard key={app.id} app={app} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} onOpenSurvey={onOpenSurvey} />
        ))}
      </div>
    </div>

    <div className="bg-red-50 border-red-200 border rounded-xl p-4 md:p-6 shadow-sm">
      <h3 className="font-bold text-red-800 text-xl mb-2 flex items-center"><span className="mr-2">⏰</span> 2. 強制ロック・時間管理系</h3>
      <div className="space-y-3">
        {appStats.filter((a: any) => a.category === "lock").map((app: any) => (
          <AppCard key={app.id} app={app} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} onOpenSurvey={onOpenSurvey} />
        ))}
      </div>
    </div>

    <div className="bg-blue-50 border-blue-200 border rounded-xl p-4 md:p-6 shadow-sm">
      <h3 className="font-bold text-blue-800 text-xl mb-2 flex items-center"><span className="mr-2">👨‍👩‍👧‍👦</span> 3. ペアレンタルコントロール・家族管理</h3>
      <div className="space-y-3">
        {appStats.filter((a: any) => a.category === "family").map((app: any) => (
          <AppCard key={app.id} app={app} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} onOpenSurvey={onOpenSurvey} />
        ))}
      </div>
    </div>
  </div>
);

/* --- 知識セクション --- */
const KnowledgeSection = () => {
  const KnowledgeLink = ({ icon, title, url, isExternal }: { icon: string; title: string; url: string; isExternal?: boolean; }) => (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block p-4 bg-white rounded-lg border border-purple-100 shadow-sm hover:shadow-md transition hover:bg-purple-50 flex items-center">
      <span className="text-3xl mr-4">{icon}</span>
      <div className="flex-1">
        <p className="font-bold text-gray-800 text-base mb-1">{title}</p>
        <p className="text-xs text-indigo-500 font-bold flex items-center">
          {isExternal ? "公式サイトへ移動" : "Google検索結果を表示"} <span className="ml-1">{isExternal ? "↗" : "🔍"}</span>
        </p>
      </div>
    </a>
  );

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border-purple-200 border rounded-xl p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="font-bold text-purple-800 text-xl mb-2 flex items-center">依存のメカニズムを知り、専門的なサポート情報にアクセスします。</h3>
        </div>

        <h4 className="font-bold text-gray-700 mb-3 border-l-4 border-purple-400 pl-3">読み物・知識</h4>
        <div className="grid grid-cols-1 gap-3 mb-6">
          <KnowledgeLink icon="📖" title="【脳科学】スマホがもたらすドーパミンの罠と対処法" url="https://www.google.com/search?q=【脳科学】スマホがもたらすドーパミンの罠と対処法" />
          <KnowledgeLink icon="🧘" title="今日からできる！デジタルデトックス入門ガイド" url="https://www.google.com/search?q=今日からできる！デジタルデトックス入門ガイド" />
          <KnowledgeLink icon="🔔" title="集中力を高めるための通知設定の極意" url="https://www.google.com/search?q=集中力を高めるための通知設定の極意" />
        </div>

        <h4 className="font-bold text-gray-700 mb-3 border-l-4 border-purple-400 pl-3">専門機関・相談窓口</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <KnowledgeLink icon="🏥" title="都道府県別依存症相談窓口" url="https://www.zmhwc.jp/index.html" isExternal />
          <KnowledgeLink icon="⚓" title="ひょうご・こうべ依存症対策センター" url="https://www.city.kobe.lg.jp/a37430/izon.html" isExternal />
        </div>
      </div>
    </div>
  );
};

/* --- パーソナライズ診断 --- */
const PersonalizeSection = ({ currentUser, appStats, chartjsConstructor, isChartJsLoaded, onOpenSurvey }: any) => {
  const savedResult = currentUser ? loadFromLocalStorage(KEY_TYPE_RESULT, null, currentUser.id) : null;
  const initialStep = savedResult ? "result" : "intro";
  const [step, setStep] = useState<"intro" | "question" | "result">(initialStep);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [scores, setScores] = useState<{[key: string]: number}>({ sns: 0, game: 0, habit: 0, work: 0 });
  const [resultType, setResultType] = useState<AddictionType | null>(savedResult);

  const handleStart = () => { setStep("question"); setCurrentQuestionIdx(0); setScores({ sns: 0, game: 0, habit: 0, work: 0 }); };
  const handleAnswer = (type: string) => {
    const newScores = { ...scores, [type]: scores[type] + 1 };
    setScores(newScores);
    if (currentQuestionIdx < PERSONALIZE_QUESTIONS.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      let maxScore = -1; let maxType: keyof typeof ADDICTION_TYPES = "habit";
      Object.entries(newScores).forEach(([key, val]) => { if (val > maxScore) { maxScore = val; maxType = key as keyof typeof ADDICTION_TYPES; } });
      const result = ADDICTION_TYPES[maxType];
      setResultType(result);
      if (currentUser) saveToLocalStorage(KEY_TYPE_RESULT, result, currentUser.id);
      setStep("result");
    }
  };
  const handleRetake = () => { setResultType(null); if (currentUser) saveToLocalStorage(KEY_TYPE_RESULT, null, currentUser.id); handleStart(); };

  const recommendedApps = resultType ? appStats
    .filter((app: AppStat) =>
      resultType!.recommendedAppIds.includes(app.id) ||
      (resultType!.recommendedCategories.includes(app.category) && Math.random() > 0.5)
    ).slice(0, 3) : [];

  if (step === "intro") {
    return (
      <div className="max-w-2xl mx-auto text-center pt-10">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-teal-100">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">依存タイプ診断</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            依存の形は人それぞれです。<br/>
            SNS、ゲーム、無意識の癖…<br/>
            あなたの傾向を分析し、最適な対策アプリを提案します。
          </p>
          <button onClick={handleStart} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 px-10 rounded-full shadow-lg transition transform hover:scale-105">
            診断をはじめる (3問)
          </button>
        </div>
      </div>
    );
  }
  if (step === "question") {
    const q = PERSONALIZE_QUESTIONS[currentQuestionIdx];
    return (
      <div className="max-w-xl mx-auto pt-10">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <div className="mb-6 flex justify-between items-center text-sm text-gray-400">
            <span>QUESTION {currentQuestionIdx + 1} / {PERSONALIZE_QUESTIONS.length}</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-8">{q.text}</h3>
          <div className="space-y-3">
            {q.options.map((opt: any, idx: number) => (
              <button key={idx} onClick={() => handleAnswer(opt.type)} className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-teal-50 hover:border-teal-300 transition font-semibold text-gray-700">
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-3xl mx-auto pt-6">
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-teal-500 mb-8 text-center">
        <p className="text-gray-500 font-bold mb-2">{currentUser ? `${currentUser.name} さんのタイプは…` : "診断結果"}</p>
        <div className="text-6xl mb-4">{resultType?.icon}</div>
        <h2 className="text-3xl font-extrabold text-teal-700 mb-4">{resultType?.name}</h2>
        <p className="text-gray-700 mb-6 leading-relaxed max-w-lg mx-auto">{resultType?.description}</p>
        <div className="bg-teal-50 p-4 rounded-lg inline-block text-teal-800 text-sm font-bold">💡 アドバイス: {resultType?.advice}</div>
        <div className="mt-6">
          <button onClick={handleRetake} className="text-sm text-gray-400 underline hover:text-teal-600">もう一度診断する</button>
        </div>
      </div>
      <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center"><span className="mr-2">🎁</span> あなたへの提案アプリ</h3>
      <div className="space-y-4">
        {recommendedApps.map((app: any) => (
          <AppCard key={app.id} app={app} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} onOpenSurvey={onOpenSurvey} />
        ))}
      </div>
    </div>
  );
};

/* --- 履歴詳細モーダル --- */
const HistoryDetailModal = ({ isOpen, onClose, record }: { isOpen: boolean; onClose: () => void; record: TestHistoryRecord | null; }) => {
  useBodyScrollLock(!!isOpen);
  if (!isOpen || !record) return null;
  const style = getResultStyle(record.level);
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200" aria-label="閉じる">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <div className="text-center mb-6">
          <p className="text-sm font-bold text-gray-500 mb-1">{record.date} の記録</p>
          <h3 className="text-2xl font-extrabold text-gray-800">診断結果詳細</h3>
        </div>
        <div className={`p-6 ${style.bg} border-2 ${style.border} rounded-xl shadow-inner mb-6`}>
          <h4 className={`text-xl font-extrabold ${style.text} mb-4 flex items-center`}><span className="text-2xl mr-2">{style.icon}</span> {record.level}</h4>
          <p className="text-lg font-bold mb-4">スコア: <span className={`${style.scoreText} text-2xl`}>{record.score}</span> / 30</p>
          <div className="border-t pt-4 border-gray-300/50">
            <h5 className={`font-bold ${style.text} mb-2`}>当時のアドバイス:</h5>
            <p className="text-gray-800 whitespace-pre-line leading-relaxed">{record.recommendation}</p>
          </div>
          {record.comparisonMessage && (
            <div className="mt-4 p-4 bg-white rounded-lg border-l-4 border-indigo-500 shadow-sm">
              <p className="font-bold text-indigo-800 flex items-start"><span className="mr-2 text-xl">💬</span>{record.comparisonMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* --- 診断テストモーダル --- */
const AddictionTestModal = React.memo(({
  isOpen, setIsModalOpen, testQuestions, testAnswers, handleAnswerChange, calculateScore,
  resetTest, testResult, testTotalScore, handleOptionClick, comparisonMessage, isLoggedIn, onLoginForHistory,
}: {
  isOpen: boolean; setIsModalOpen: (v: boolean) => void;
  testQuestions: string[]; testAnswers: number[]; handleAnswerChange: (idx: number, score: number) => void;
  calculateScore: () => void; resetTest: () => void;
  testResult: { level: string; recommendation: string } | null; testTotalScore: number | null;
  handleOptionClick: (e: React.MouseEvent) => void; comparisonMessage: string | null;
  isLoggedIn: boolean; onLoginForHistory: () => void;
}) => {
  useBodyScrollLock(!!isOpen);
  if (!isOpen) return null;

  const answeredCount = testAnswers.filter((s: any) => s !== null && s !== undefined).length;
  const isAllAnswered = answeredCount === testQuestions.length;

  const options = [
    { label: "全くない (0点)", score: 0, class: "border-green-400 bg-green-50 text-green-700 hover:bg-green-100" },
    { label: "たまにある (1点)", score: 1, class: "border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100" },
    { label: "よくある (2点)", score: 2, class: "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100" },
    { label: "ほとんどいつも (3点)", score: 3, class: "border-red-400 bg-red-50 text-red-700 hover:bg-red-100" }
  ];

  const style = testResult ? getResultStyle(testResult.level) : null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[100]">
      <div className={`bg-white w-full max-w-[92vw] md:max-w-[800px] max-h-[99svh] md:max-h-[96.5vh] ${testResult ? 'overflow-hidden' : 'overflow-auto'} rounded-lg shadow-2xl p-2 md:p-4 relative`} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setIsModalOpen(false)}
          className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          aria-label="閉じる"
          title="閉じる"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <h3 className="font-extrabold text-indigo-700 text-3xl mb-4 border-b pb-2 flex items-center">
          <span className="text-4xl mr-2">📱</span> スマートフォン依存度 診断テスト
        </h3>

        {testResult && style ? (
          <div className={`mt-8 p-6 ${style.bg} border-2 ${style.border} rounded-xl shadow-inner`}>
            <h4 className={`text-2xl font-extrabold ${style.text} mb-4 flex items-center`}><span className="text-3xl mr-2">{style.icon}</span> 診断結果</h4>

            {!isLoggedIn && (
              <div className="mb-4 p-4 bg-white rounded-lg border-l-4 border-indigo-500 shadow-sm">
                <p className="text-sm text-gray-600">
                  この結果は表示のみです。<span className="font-bold text-indigo-700">履歴に保存するにはログイン</span>してください。
                </p>
                <div className="mt-3">
                  <button onClick={onLoginForHistory} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md">
                    ログインして履歴保存
                  </button>
                </div>
              </div>
            )}

            {comparisonMessage && (
              <div className="mb-6 p-4 bg-white rounded-lg border-l-4 border-indigo-500 shadow-sm">
                <p className="font-bold text-indigo-800 flex items-start"><span className="mr-2 text-xl">💬</span>{comparisonMessage}</p>
              </div>
            )}

            <p className="text-xl font-bold mb-2">判定レベル: <span className={`${style.scoreText} text-3xl`}>{testResult.level}</span></p>
            <p className="text-lg font-bold mb-4">合計スコア: <span className={`${style.scoreText} text-2xl`}>{testTotalScore}点</span></p>

            <div className="border-t pt-4 border-gray-300/50">
              <h5 className={`font-bold ${style.text} mb-2`}>おすすめの行動指針:</h5>
              <p className="text-gray-800 whitespace-pre-line leading-relaxed">{testResult.recommendation}</p>
            </div>

            <div className="flex items-center gap-3 mt-8">
              <div className="ml-auto flex items-center gap-3">
                {/* 再診断ボタン（色を元に戻す場合はここだけ変更） */}
                <button
                  onClick={resetTest}
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base rounded-full shadow-lg transition transform hover:scale-[1.02]"
                >
                  再診断する
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 bg-white border border-gray-300 text-gray-700 font-extrabold text-base rounded-full shadow-lg hover:bg-gray-50 transition"
                  title="閉じる"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {testQuestions.map((question: string, index: number) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                <p className="font-bold text-gray-800 mb-3">Q{index + 1}. {question}</p>
                <div className="flex flex-wrap gap-3">
                  {options.map((option) => (
                    <label key={option.score} className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition duration-150 ease-in-out text-sm font-semibold ${option.class} ${testAnswers[index] === option.score ? "ring-4 ring-offset-2" : ""}`} onClick={handleOptionClick}>
                      <input type="radio" name={`question-${index}`} value={option.score} checked={testAnswers[index] === option.score} onChange={() => handleAnswerChange(index, option.score)} className="sr-only" />
                      <span className="ml-0 text-center">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-3 justify-end p-4">
              <button onClick={calculateScore} disabled={!isAllAnswered} className={`px-8 py-3 font-bold rounded-lg transition transform hover:scale-[1.01] shadow-lg ${isAllAnswered ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}>
                診断する ({answeredCount} / {testQuestions.length}問回答済み)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
AddictionTestModal.displayName = "AddictionTestModal";

/* ===============================================
 7. メインコンテンツ
=============================================== */

/** _agg を必ず持つ型へナローイング（TS18048対策） */
type Agg = NonNullable<AppStat["_agg"]>;
type AggAppStat = Omit<AppStat, "_agg"> & { _agg: Agg };
function toAgg(app: AppStat): AggAppStat {
  const tv = Math.max(0, app.totalVotes);
  const agg: Agg = app._agg ?? {
    successCount: Math.round(app.successRate * tv / 100),
    ratingSums: {
      effectiveness: app.ratings.effectiveness * tv,
      fun: app.ratings.fun * tv,
      ease: app.ratings.ease * tv,
      continuity: app.ratings.continuity * tv,
      design: app.ratings.design * tv,
    },
  };
  return { ...app, _agg: { ...agg } };
}

/** 副作用なしの再計算（不変更新） */
function recomputeAveragesPure(app: AppStat): AppStat {
  const tv = Math.max(0, app.totalVotes);
  const agg = app._agg ?? {
    successCount: Math.round(app.successRate * tv / 100),
    ratingSums: {
      effectiveness: app.ratings.effectiveness * tv,
      fun: app.ratings.fun * tv,
      ease: app.ratings.ease * tv,
      continuity: app.ratings.continuity * tv,
      design: app.ratings.design * tv,
    }
  };

  const clampedSuccess = Math.min(tv, Math.max(0, agg.successCount));
  const rawRate = tv > 0 ? (clampedSuccess / tv) * 100 : 0;
  const successRate = Math.min(100, Math.max(0, Math.round(rawRate)));

  const sums = agg.ratingSums;
  const safeSums = {
    effectiveness: Math.max(0, sums.effectiveness),
    fun: Math.max(0, sums.fun),
    ease: Math.max(0, sums.ease),
    continuity: Math.max(0, sums.continuity),
    design: Math.max(0, sums.design),
  };
  const clamp5 = (v: number) => Math.min(5, Math.max(0, parseFloat(v.toFixed(1))));

  const ratings = tv > 0
    ? {
        effectiveness: clamp5(safeSums.effectiveness / tv),
        fun: clamp5(safeSums.fun / tv),
        ease: clamp5(safeSums.ease / tv),
        continuity: clamp5(safeSums.continuity / tv),
        design: clamp5(safeSums.design / tv),
      }
    : { effectiveness: 0, fun: 0, ease: 0, continuity: 0, design: 0 };

  return {
    ...app,
    successRate,
    ratings,
    _agg: { successCount: clampedSuccess, ratingSums: safeSums },
  };
}

const MainContent = ({
  currentUser, users, onOpenAuth, onOpenProfile, onLogout, chartjsConstructor, isChartJsLoaded,
  activeTab, setActiveTab,
}: {
  currentUser: User | null; users: User[]; onOpenAuth: () => void; onOpenProfile: () => void; onLogout: () => void;
  chartjsConstructor: ChartConstructor; isChartJsLoaded: boolean;
  activeTab: "diagnosis" | "personalize" | "resources" | "knowledge";
  setActiveTab: (id: "diagnosis" | "personalize" | "resources" | "knowledge") => void;
}) => {
  const [testAnswers, setTestAnswers] = useState<number[]>(initialTestAnswers);
  const [testTotalScore, setTestTotalScore] = useState<number | null>(initialTestScore);
  const [testResult, setTestResult] = useState<{ level: string, recommendation: string } | null>(initialTestResult);
  const [testHistory, setTestHistory] = useState<TestHistoryRecord[]>([]);
  const [appStats, setAppStats] = useState<AppStat[]>(initialAppStats);
  const [isAppStatsLoaded, setIsAppStatsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comparisonMessage, setComparisonMessage] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"10" | "all">("10");
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<TestHistoryRecord | null>(null);
  const [isHistoryDetailOpen, setIsHistoryDetailOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [surveyTargetApp, setSurveyTargetApp] = useState<AppStat | null>(null);
  const [userRatings, setUserRatings] = useState<UserRatingsMap>({});
  const [hasLoadedUserData, setHasLoadedUserData] = useState(false);

  /* ロード（ユーザー別）＋未ログイン保留結果の取り込み */
  useEffect(() => {
    const userId = currentUser?.id;
    if (userId) {
      const loadedAnswers = loadFromLocalStorage(KEY_ANSWERS, initialTestAnswers, userId);
      const loadedScore = loadFromLocalStorage(KEY_SCORE, initialTestScore, userId);
      const loadedResult = loadFromLocalStorage(KEY_RESULT, initialTestResult, userId);
      const loadedHistory = loadFromLocalStorage<TestHistoryRecord[]>(KEY_HISTORY, [], userId);
      const loadedRatings = loadFromLocalStorage(KEY_USER_RATINGS, {}, userId);

      setTestAnswers(loadedAnswers);
      setTestTotalScore(loadedScore);
      setTestResult(loadedResult);
      setTestHistory(loadedHistory);
      setUserRatings(loadedRatings);

      const latest = loadedHistory?.[0];
      setComparisonMessage(latest?.comparisonMessage ?? null);
      setHasLoadedUserData(true);

      // 直前のゲスト結果があれば履歴へ自動追加
      const pending = loadFromLocalStorage<PendingResult | null>(KEY_PENDING_RESULT, null);
      if (pending && pending.score !== undefined && pending.level && pending.recommendation) {
        const record: TestHistoryRecord = {
          id: Date.now(),
          date: pending.date || formatDate(new Date()),
          score: pending.score,
          level: pending.level,
          recommendation: pending.recommendation,
          comparisonMessage: pending.comparisonMessage || undefined,
        };
        setTestHistory(prev => [record, ...prev]);
        removeFromLocalStorage(KEY_PENDING_RESULT);
        setTestTotalScore(pending.score);
        setTestResult({ level: pending.level, recommendation: pending.recommendation });
        setComparisonMessage(pending.comparisonMessage || null);
      }
    } else {
      setTestAnswers(initialTestAnswers);
      setTestTotalScore(initialTestScore);
      setTestResult(initialTestResult);
      setTestHistory([]);
      setUserRatings({});
      setComparisonMessage(null);
      setHasLoadedUserData(false);
    }
  }, [currentUser?.id]);

  /* AppStats ロード＆移行 */
  useEffect(() => {
    const loaded = loadFromLocalStorage<AppStat[]>(KEY_APP_STATS, initialAppStats);
    const migrated = loaded.map((app) => {
      const anyApp = app as any;
      if (!anyApp._agg) {
        anyApp._agg = {
          successCount: Math.round(app.successRate * app.totalVotes / 100),
          ratingSums: {
            effectiveness: app.ratings.effectiveness * app.totalVotes,
            fun: app.ratings.fun * app.totalVotes,
            ease: app.ratings.ease * app.totalVotes,
            continuity: app.ratings.continuity * app.totalVotes,
            design: app.ratings.design * app.totalVotes,
          }
        };
      }
      return anyApp as AppStat;
    });
    setAppStats(migrated);
    setIsAppStatsLoaded(true);
  }, []);

  /* 保存 */
  useEffect(() => { if (currentUser && hasLoadedUserData) saveToLocalStorage(KEY_ANSWERS, testAnswers, currentUser.id); }, [testAnswers, currentUser, hasLoadedUserData]);
  useEffect(() => { if (currentUser && hasLoadedUserData) saveToLocalStorage(KEY_SCORE, testTotalScore, currentUser.id); }, [testTotalScore, currentUser, hasLoadedUserData]);
  useEffect(() => { if (currentUser && hasLoadedUserData) saveToLocalStorage(KEY_RESULT, testResult, currentUser.id); }, [testResult, currentUser, hasLoadedUserData]);
  useEffect(() => { if (currentUser && hasLoadedUserData) saveToLocalStorage(KEY_HISTORY, testHistory, currentUser.id); }, [testHistory, currentUser, hasLoadedUserData]);
  useEffect(() => { if (isAppStatsLoaded) saveToLocalStorage(KEY_APP_STATS, appStats); }, [appStats, isAppStatsLoaded]);
  useEffect(() => { if (currentUser && hasLoadedUserData) saveToLocalStorage(KEY_USER_RATINGS, userRatings, currentUser.id); }, [userRatings, currentUser, hasLoadedUserData]);

  /* 診断処理（未ログインは保留結果に保存） */
  const handleAnswerChange = (qIndex: number, score: number) =>
    setTestAnswers(prev => { const n = [...prev]; n[qIndex] = score; return n; });

  const handleOptionClick = (e: React.MouseEvent) => e.stopPropagation();

  const calculateScore = () => {
    const total = testAnswers.reduce((sum, s) => sum + (s ?? 0), 0);
    setTestTotalScore(total);
    const { level, recommendation } = getResultFromScore(total);
    setTestResult({ level, recommendation });

    let msg = "";
    if (currentUser && testHistory.length > 0) {
      const prevScore = testHistory[0].score;
      if (total < prevScore) msg = IMPROVEMENT_MESSAGES[Math.floor(Math.random() * IMPROVEMENT_MESSAGES.length)];
      else if (total > prevScore) msg = WORSENING_MESSAGES[Math.floor(Math.random() * WORSENING_MESSAGES.length)];
      else msg = SAME_SCORE_MESSAGES[Math.floor(Math.random() * SAME_SCORE_MESSAGES.length)];
    }
    setComparisonMessage(msg || null);

    if (currentUser) {
      const newRecord: TestHistoryRecord = {
        id: Date.now(),
        date: formatDate(new Date()),
        score: total,
        level,
        recommendation,
        comparisonMessage: msg || undefined,
      };
      setTestHistory(prev => [newRecord, ...prev]);
    } else {
      const pending: PendingResult = {
        date: formatDate(new Date()),
        score: total,
        level,
        recommendation,
        comparisonMessage: undefined,
      };
      saveToLocalStorage(KEY_PENDING_RESULT, pending);
    }
  };

  const resetTest = () => {
    setTestAnswers(new Array(testQuestions.length).fill(null));
    setTestTotalScore(null);
    setTestResult(null);
    setComparisonMessage(null);
  };

  /* 履歴 */
  const handleDeleteHistoryItem = (e: React.MouseEvent, recordId: number) => {
    e.stopPropagation();
    if (!currentUser) { onOpenAuth(); return; }
    if (!confirm("この履歴を削除しますか？")) return;
    setTestHistory(prev => prev.filter(item => item.id !== recordId));
  };
  const clearHistory = () => {
    if (!currentUser) { onOpenAuth(); return; }
    if (confirm("履歴をすべて削除しますか？")) setTestHistory([]);
  };
  const openHistoryDetail = (record: TestHistoryRecord) => { setSelectedHistoryRecord(record); setIsHistoryDetailOpen(true); };

  /* 投票 */
  const openSurvey = (app: AppStat) => {
    if (!currentUser) { onOpenAuth(); return; }
    setSurveyTargetApp(app);
    setIsSurveyOpen(true);
  };

  const handleSurveySubmit = (appId: string, isSuccess: boolean, userRatingsInput: any) => {
    if (!currentUser) { onOpenAuth(); return; }
    const prevUserRating = userRatings[appId] ?? null;

    setAppStats((prevStats: AppStat[]) =>
      prevStats.map((app: AppStat) => {
        if (app.id !== appId) return app;

        let nextApp = toAgg(app); // AggAppStat

        if (!prevUserRating) {
          nextApp._agg.successCount += isSuccess ? 1 : 0;
          nextApp.totalVotes += 1;
          nextApp._agg.ratingSums.effectiveness += userRatingsInput.effectiveness;
          nextApp._agg.ratingSums.fun          += userRatingsInput.fun;
          nextApp._agg.ratingSums.ease         += userRatingsInput.ease;
          nextApp._agg.ratingSums.continuity   += userRatingsInput.continuity;
          nextApp._agg.ratingSums.design       += userRatingsInput.design;
        } else {
          nextApp._agg.successCount += (isSuccess ? 1 : 0) - (prevUserRating.isSuccess ? 1 : 0);
          nextApp._agg.ratingSums.effectiveness += userRatingsInput.effectiveness - prevUserRating.ratings.effectiveness;
          nextApp._agg.ratingSums.fun          += userRatingsInput.fun          - prevUserRating.ratings.fun;
          nextApp._agg.ratingSums.ease         += userRatingsInput.ease         - prevUserRating.ratings.ease;
          nextApp._agg.ratingSums.continuity   += userRatingsInput.continuity   - prevUserRating.ratings.continuity;
          nextApp._agg.ratingSums.design       += userRatingsInput.design       - prevUserRating.ratings.design;
        }

        nextApp._agg.successCount = Math.min(nextApp.totalVotes, Math.max(0, nextApp._agg.successCount));
        nextApp._agg.ratingSums.effectiveness = Math.max(0, nextApp._agg.ratingSums.effectiveness);
        nextApp._agg.ratingSums.fun          = Math.max(0, nextApp._agg.ratingSums.fun);
        nextApp._agg.ratingSums.ease         = Math.max(0, nextApp._agg.ratingSums.ease);
        nextApp._agg.ratingSums.continuity   = Math.max(0, nextApp._agg.ratingSums.continuity);
        nextApp._agg.ratingSums.design       = Math.max(0, nextApp._agg.ratingSums.design);

        return recomputeAveragesPure(nextApp);
      })
    );

    const newUserRatings: UserRatingsMap = {
      ...userRatings,
      [appId]: { isSuccess, ratings: userRatingsInput, updatedAt: formatDate(new Date()) }
    };
    setUserRatings(newUserRatings);

    alert(prevUserRating ? "評価を更新しました。グラフが更新されました。" : "投票ありがとうございました！グラフが更新されました。");
  };

  const handleSurveyDelete = (appId: string) => {
    if (!currentUser) { onOpenAuth(); return; }
    const prevUserRating = userRatings[appId];
    if (!prevUserRating) return;

    setAppStats((prevStats: AppStat[]) =>
      prevStats.map((app: AppStat) => {
        if (app.id !== appId) return app;

        let nextApp = toAgg(app); // AggAppStat

        nextApp.totalVotes = Math.max(0, nextApp.totalVotes - 1);
        nextApp._agg.successCount -= prevUserRating.isSuccess ? 1 : 0;
        nextApp._agg.ratingSums.effectiveness -= prevUserRating.ratings.effectiveness;
        nextApp._agg.ratingSums.fun          -= prevUserRating.ratings.fun;
        nextApp._agg.ratingSums.ease         -= prevUserRating.ratings.ease;
        nextApp._agg.ratingSums.continuity   -= prevUserRating.ratings.continuity;
        nextApp._agg.ratingSums.design       -= prevUserRating.ratings.design;

        nextApp._agg.successCount = Math.min(nextApp.totalVotes, Math.max(0, nextApp._agg.successCount));
        nextApp._agg.ratingSums.effectiveness = Math.max(0, nextApp._agg.ratingSums.effectiveness);
        nextApp._agg.ratingSums.fun          = Math.max(0, nextApp._agg.ratingSums.fun);
        nextApp._agg.ratingSums.ease         = Math.max(0, nextApp._agg.ratingSums.ease);
        nextApp._agg.ratingSums.continuity   = Math.max(0, nextApp._agg.ratingSums.continuity);
        nextApp._agg.ratingSums.design       = Math.max(0, nextApp._agg.ratingSums.design);

        return recomputeAveragesPure(nextApp);
      })
    );

    const { [appId]: _, ...rest } = userRatings;
    setUserRatings(rest);
    alert("あなたの評価を削除しました。グラフを更新しました。");
  };

  /* 画面レンダリング */
  const renderContent = () => {
    const displayHistory = historyFilter === "10" ? testHistory.slice(0, 10) : testHistory;
    switch (activeTab) {
      case "diagnosis":
        return (
          <div className="max-w-2xl mx-auto space-y-8 pt-10">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
              <div className="text-6xl mb-4">🍀</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">依存度チェック</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {currentUser ? `${currentUser.name} さんこんにちは。` : "こんにちは。"}<br/>
                あなたのスマートフォンの利用状況を客観的に見直してみませんか？<br/>
                簡単な10個の質問に答えるだけで、依存度レベルとアドバイスを確認できます。
              </p>
              <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-full shadow-lg transition transform hover:scale-105">
                診断テストをはじめる
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-700 flex items-center"><span className="mr-2">📋</span> 過去の履歴</h3>
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setHistoryFilter("10")} className={`px-3 py-1 rounded-md text-xs font-bold transition ${historyFilter === "10" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>最新10件</button>
                  <button onClick={() => setHistoryFilter("all")} className={`px-3 py-1 rounded-md text-xs font-bold transition ${historyFilter === "all" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>すべて</button>
                </div>
              </div>

              {displayHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">まだ履歴がありません。<br/>ログインすると診断後に履歴が保存されます。</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayHistory.map((record: TestHistoryRecord) => (
                    <div key={record.id} onClick={() => openHistoryDetail(record)} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm cursor-pointer hover:bg-indigo-50 transition border-l-4 hover:border-l-indigo-500 group">
                      <div className="font-semibold text-gray-600 pl-1">{record.date}</div>
                      <div className="flex items-center space-x-3">
                        <div className="text-gray-500 hidden sm:block">スコア: <span className="font-bold text-gray-800">{record.score}</span></div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          record.level === "重度依存" ? "bg-red-50 text-red-700 border-red-200"
                          : record.level === "中度依存" ? "bg-orange-50 text-orange-700 border-orange-200"
                          : record.level === "軽度依存" ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : "bg-green-50 text-green-700 border-green-200"
                        }`}>{record.level}</div>
                        <button onClick={(e) => handleDeleteHistoryItem(e, record.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition" title="この履歴を削除">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        <div className="text-gray-300 group-hover:text-indigo-400 transition">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {currentUser && testHistory.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-right">
                  <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-red-500 transition underline">すべての履歴を削除する</button>
                </div>
              )}
            </div>
          </div>
        );

      case "personalize":
        return <PersonalizeSection currentUser={currentUser} appStats={appStats} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} onOpenSurvey={openSurvey} />;

      case "resources":
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 flex items-center"><span className="mr-2">📚</span> お役立ちリソース & ユーザー評価</h2>
            <ResourceSection appStats={appStats} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} onOpenSurvey={openSurvey} />
          </div>
        );

      case "knowledge":
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 flex items-center"><span className="mr-2">🧠</span> 脳科学・知識・相談</h2>
            <KnowledgeSection />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-24">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Digital Wellbeing</h1>
          <div className="flex items-center space-x-2">
            {!currentUser ? (
              <button onClick={onOpenAuth} className="text-xs bg-white text-indigo-600 px-3 py-2 rounded font-bold hover:bg-gray-100 transition shadow">
                ログイン・ユーザー登録
              </button>
            ) : (
              <>
                <span className="text-xs bg-white text-indigo-600 px-3 py-2 rounded font-bold shadow flex items-center">
                  <span className="mr-1 text-lg">{currentUser.icon}</span>
                  <span>{currentUser.name} さん</span>
                </span>
                <button onClick={onOpenProfile} className="text-xs bg-white text-indigo-600 px-3 py-2 rounded font-bold hover:bg-gray-100 transition shadow">⚙️ 設定</button>
                <button
                  onClick={() => { if (confirm("ログアウトしますか？")) { onLogout(); } }}
                  className="text-xs bg-rose-100 text-rose-700 px-3 py-2 rounded font-bold border border-rose-300 hover:bg-rose-200 transition"
                >
                  ログアウト
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* メイン */}
      <main className="max-w-5xl mx-auto p-4 md:p-6">{renderContent()}</main>

      {/* フッター ナビ */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="max-w-5xl mx-auto flex justify-around items-center">
          {[
            { id: "diagnosis", label: "診断", icon: "\uD83E\uDE7A" },
            { id: "personalize", label: "タイプ診断", icon: "\uD83D\uDD0D" },
            { id: "resources", label: "ガイド", icon: "\uD83D\uDCDA" },
            { id: "knowledge", label: "知識", icon: "\uD83E\uDDE0" }
          ].map((tab) => (
            <button
              key={tab.id as any}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center w-full py-3 transition ${activeTab === tab.id ? "text-indigo-600 bg-indigo-50" : "text-gray-400 hover:text-gray-600"}`}
            >
              <span className="text-2xl mb-1">{tab.icon}</span>
              <span className="text-xs font-bold">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* モーダル群 */}
      <AddictionTestModal
        isOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        testQuestions={testQuestions}
        testAnswers={testAnswers}
        handleAnswerChange={handleAnswerChange}
        calculateScore={calculateScore}
        resetTest={resetTest}
        testResult={testResult}
        testTotalScore={testTotalScore}
        handleOptionClick={handleOptionClick}
        comparisonMessage={comparisonMessage}
        isLoggedIn={!!currentUser}
        onLoginForHistory={onOpenAuth}
      />
      <HistoryDetailModal
        isOpen={isHistoryDetailOpen}
        onClose={() => setIsHistoryDetailOpen(false)}
        record={selectedHistoryRecord}
      />
      <SurveyModal
        isOpen={isSurveyOpen}
        onClose={() => setIsSurveyOpen(false)}
        app={surveyTargetApp}
        onSubmit={(appId: string, isSuccess: boolean, ratings: any) => handleSurveySubmit(appId, isSuccess, ratings)}
        onDelete={handleSurveyDelete}
        existingRating={surveyTargetApp && currentUser ? userRatings[surveyTargetApp.id] : null}
      />
    </div>
  );
};

/* ===============================================
 8. 管理者画面（admin / admin のみ遷移）
=============================================== */
const AdminPanel = ({
  users, onClose, onDeleteUserDeep, onResetAllRatings, onClearAllUserData,
  appStats, onApplyDemoStats, onRestoreFromBackup,
}: {
  users: User[];
  onClose: () => void;
  onDeleteUserDeep: (userId: string) => void;
  onResetAllRatings: () => void;
  onClearAllUserData: () => void;
  appStats: AppStat[];
  onApplyDemoStats: () => void;
  onRestoreFromBackup: () => void;
}) => {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [demoMode, setDemoMode] = useState<"ratings" | "userData">("ratings");
  const openRatingsDemo = () => { setDemoMode("ratings"); setIsDemoOpen(true); };
  const openUserDataDemo = () => { setDemoMode("userData"); setIsDemoOpen(true); };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-gradient-to-r from-red-600 to-pink-600 text-white p-4 shadow-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">管理者画面</h1>
          <button onClick={onClose} className="text-xs bg-white text-red-600 px-3 py-2 rounded font-bold hover:bg-gray-100 transition shadow">終了</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-3">グローバル操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={openRatingsDemo} className="px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-lg font-bold">評価データ初期化（全体）</button>
            <button onClick={openUserDataDemo} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold">全ユーザーの診断履歴・結果・タイプ削除</button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-3">ユーザー一覧</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.length === 0 ? (
              <div className="text-gray-400 text-sm">ユーザーがいません。</div>
            ) : users.map((u) => (
              <div key={u.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800">{u.name}</p>
                  <p className="text-xs text-gray-400">ID: {u.id}</p>
                </div>
                <button
                  onClick={() => { if (confirm(`「${u.name}」を完全削除します。\n評価寄与を集計から差し引き、ユーザーデータを削除します。よろしいですか？`)) { onDeleteUserDeep(u.id); } }}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      <AdminActionDemoModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        mode={demoMode}
        users={users}
        currentAppStats={appStats}
        onExecute={() => {
          if (demoMode === "ratings") { onResetAllRatings(); }
          else { onClearAllUserData(); }
          setIsDemoOpen(false);
        }}
        onApplyDemo={() => {
          onApplyDemoStats();
          alert("デモデータを適用しました。画面上のグラフやカードで見え方を確認できます。");
        }}
        onRestore={() => {
          onResetAllRatings();
          alert("評価データを完全に0件に初期化しました。");
        }}
      />
    </div>
  );
};

/* ===============================================
 9. ルートコンポーネント（タブ別スクロール位置の保存・復元＋ログイン/ログアウト時トップ表示）
=============================================== */
const DigitalWellbeingApp: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isChartJsLoaded, setIsChartJsLoaded] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [appStats, setAppStats] = useState<AppStat[]>(initialAppStats);
  const chartjsConstructorRef = useRef<ChartConstructor | null>(null);
  const [activeTab, setActiveTab] = useState<"diagnosis" | "personalize" | "resources" | "knowledge">("diagnosis");

  /** Chart.js 読み込み */
  useEffect(() => {
    if (isChartJsLoaded) return;
    const cdnUrl = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    const script = document.createElement("script");
    script.src = cdnUrl;
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      if ((window as any).Chart) {
        chartjsConstructorRef.current = (window as any).Chart;
        setIsChartJsLoaded(true);
      }
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [isChartJsLoaded]);

  /** 初期ロード */
  useEffect(() => {
    const loadedUsersRaw = loadFromLocalStorage<any[]>(KEY_USERS, []);
    const migratedUsers: User[] = loadedUsersRaw.map((u: any) => ({
      id: String(u.id),
      name: String(u.name ?? ""),
      password: String(u.password ?? u.pin ?? ""),
      icon: String(u.icon ?? USER_ICONS[0]),
    }));
    setUsers(migratedUsers);
    saveToLocalStorage(KEY_USERS, migratedUsers);

    const loadedAppStats = loadFromLocalStorage<AppStat[]>(KEY_APP_STATS, initialAppStats);
    setAppStats(loadedAppStats);

    const savedTab = loadFromLocalStorage(KEY_ACTIVE_TAB, "diagnosis");
    setActiveTab(savedTab as any);

    const lastId = loadFromLocalStorage<string | null>(KEY_LAST_USER_ID, null);
    if (lastId) {
      const u = migratedUsers.find(x => x.id === lastId);
      if (u) setCurrentUser(u);
    }
    setIsAppLoading(false);
  }, []);

  /** 二重ガード：last user 復元 */
  useEffect(() => {
    if (isAppLoading) return;
    if (currentUser) return;
    const lastId = loadFromLocalStorage<string | null>(KEY_LAST_USER_ID, null);
    if (!lastId) return;
    const u = users.find(x => x.id === lastId);
    if (u) setCurrentUser(u);
  }, [isAppLoading, currentUser, users]);

  /** 保存 */
  useEffect(() => { saveToLocalStorage(KEY_ACTIVE_TAB, activeTab); }, [activeTab]);
  useEffect(() => { saveToLocalStorage(KEY_USERS, users); }, [users]);
  useEffect(() => { saveToLocalStorage(KEY_APP_STATS, appStats); }, [appStats]);

  /* タブ別スクロール位置の保存・復元 */
  const scrollSaveTimer = useRef<number | null>(null);
  const getScrollKey = (tab: string) => `${SCROLL_KEY_PREFIX}${tab}`;

  useEffect(() => {
    const onScroll = () => {
      if (scrollSaveTimer.current) window.clearTimeout(scrollSaveTimer.current);
      scrollSaveTimer.current = window.setTimeout(() => {
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        saveToLocalStorage(getScrollKey(activeTab), y);
      }, 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollSaveTimer.current) window.clearTimeout(scrollSaveTimer.current);
    };
  }, [activeTab]);

  useEffect(() => {
    requestAnimationFrame(() => {
      setTimeout(() => { window.scrollTo(0, 0); }, 0);
    });
  }, [activeTab]);

  useEffect(() => {
    if (isAppLoading) return;
    const savedY = loadFromLocalStorage<number>(getScrollKey(activeTab), 0);
    requestAnimationFrame(() => {
      setTimeout(() => { window.scrollTo(0, savedY); }, 0);
    });
  }, [isAppLoading]);

  const resetAllTabScrollPositions = () => {
    (["diagnosis", "personalize", "resources", "knowledge"] as const).forEach(tab =>
      saveToLocalStorage(getScrollKey(tab), 0)
    );
  };

  /** 認証ハンドラ */
  const handleRegister = (username: string, password: string, icon: string): boolean => {
    const dup = users.some(u => u.name === username);
    if (dup) {
      alert("そのユーザー名は既に使用されています。別の名前を入力してください。");
      return false;
    }
    const newUser: User = { id: Date.now().toString(), name: username, password, icon };
    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    saveToLocalStorage(KEY_USERS, nextUsers);
    setCurrentUser(newUser);
    saveToLocalStorage(KEY_LAST_USER_ID, newUser.id);
    resetAllTabScrollPositions();
    requestAnimationFrame(() => { setTimeout(() => window.scrollTo(0, 0), 0); });
    return true;
  };

  const handleLogin = (username: string, password: string): boolean => {
    const user = users.find(u => u.name === username && u.password === password);
    if (!user) { return false; }
    setCurrentUser(user);
    saveToLocalStorage(KEY_LAST_USER_ID, user.id);
    resetAllTabScrollPositions();
    requestAnimationFrame(() => { setTimeout(() => window.scrollTo(0, 0), 0); });
    return true;
  };

  const handleAdminLogin = () => { setIsAdminMode(true); };

  const handleLogoutUser = () => {
    setCurrentUser(null);
    setIsAdminMode(false);
    setActiveTab("diagnosis");
    removeFromLocalStorage(KEY_LAST_USER_ID);
    resetAllTabScrollPositions();
    requestAnimationFrame(() => { setTimeout(() => window.scrollTo(0, 0), 0); });
  };

  /** アカウント更新 */
  const updateCurrentUser = (nextName: string, nextPassword: string, nextIcon: string) => {
    if (!currentUser) return;
    const nextUsers = users.map(u => u.id === currentUser.id ? { ...u, name: nextName, password: nextPassword, icon: nextIcon } : u);
    setUsers(nextUsers);
    saveToLocalStorage(KEY_USERS, nextUsers);
    setCurrentUser(prev => prev ? { ...prev, name: nextName, password: nextPassword, icon: nextIcon } : prev);
  };

  /** 管理者：ユーザー完全削除 */
  const onDeleteUserDeep = (userId: string) => {
    const nextUsers = users.filter(u => u.id !== userId);
    setUsers(nextUsers);
    saveToLocalStorage(KEY_USERS, nextUsers);
    const lastId = loadFromLocalStorage<string | null>(KEY_LAST_USER_ID, null);
    if (lastId === userId) { removeFromLocalStorage(KEY_LAST_USER_ID); }
    if (currentUser && currentUser.id === userId) { setCurrentUser(null); setActiveTab("diagnosis"); }
    [KEY_ANSWERS, KEY_SCORE, KEY_RESULT, KEY_HISTORY, KEY_TYPE_RESULT, KEY_ACTIVE_TAB, KEY_USER_RATINGS].forEach((k) =>
      removeFromLocalStorage(k, userId)
    );
  };

  /** 本人アカウント削除：完全削除 -> 自動ログアウト -> 診断タブへ */
  const handleDeleteOwnAccount = () => {
    if (!currentUser) return;
    const userId = currentUser.id;
    onDeleteUserDeep(userId);
    setCurrentUser(null);
    setIsAdminMode(false);
    setActiveTab("diagnosis");
    removeFromLocalStorage(KEY_LAST_USER_ID);
    resetAllTabScrollPositions();
    requestAnimationFrame(() => { setTimeout(() => window.scrollTo(0, 0), 0); });
  };

  /** 管理者：評価データ完全初期化（0件へ） */
  const onResetAllRatings = () => {
    const emptyStats = initialAppStats.map((app) => ({
      ...app,
      successRate: 0,
      totalVotes: 0,
      ratings: { effectiveness: 0, fun: 0, ease: 0, continuity: 0, design: 0 },
      _agg: { successCount: 0, ratingSums: { effectiveness: 0, fun: 0, ease: 0, continuity: 0, design: 0 } },
    }));
    setAppStats(emptyStats);
    users.forEach(u => { removeFromLocalStorage(KEY_USER_RATINGS, u.id); });
    saveToLocalStorage(KEY_APP_STATS, emptyStats);
    alert("評価データを空の状態（0件）に初期化しました。");
  };

  /** 管理者：全ユーザー診断関連データ削除 */
  const onClearAllUserData = () => {
    users.forEach((u) => {
      [KEY_ANSWERS, KEY_SCORE, KEY_RESULT, KEY_HISTORY, KEY_TYPE_RESULT, KEY_ACTIVE_TAB].forEach((k) =>
        removeFromLocalStorage(k, u.id)
      );
    });
    alert("全ユーザーの診断関連データを削除しました。");
  };

  /** 管理者：デモ値適用（バックアップは保持） */
  const applyDemoStats = () => {
    const hasBackup = loadFromLocalStorage<AppStat[] | null>(KEY_APP_STATS_BACKUP, null);
    if (!hasBackup) saveToLocalStorage(KEY_APP_STATS_BACKUP, appStats);
    const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
    const avg = () => parseFloat((3 + Math.random() * 2).toFixed(1));
    const demo = appStats.map(app => {
      const cfg = app.category === "gamification"
        ? { rate: [65, 90], votes: [500, 2000] }
        : app.category === "lock"
        ? { rate: [70, 95], votes: [600, 2500] }
        : { rate: [75, 90], votes: [800, 3000] };
      return {
        ...app,
        successRate: rand(cfg.rate[0], cfg.rate[1]),
        totalVotes: rand(cfg.votes[0], cfg.votes[1]),
        ratings: { effectiveness: avg(), fun: avg(), ease: avg(), continuity: avg(), design: avg() },
      };
    });
    setAppStats(demo);
    saveToLocalStorage(KEY_APP_STATS, demo);
  };

  const restoreFromBackup = () => {
    const backup = loadFromLocalStorage<AppStat[] | null>(KEY_APP_STATS_BACKUP, null);
    if (!backup) {
      alert("バックアップが見つかりません。デモ適用前の状態である可能性があります。");
      return;
    }
    setAppStats(backup);
    saveToLocalStorage(KEY_APP_STATS, backup);
    removeFromLocalStorage(KEY_APP_STATS_BACKUP);
  };

  // ★ ここが今回の修正：全画面固定オーバーレイで Loading を中央表示
  if (isAppLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-sm md:text-base font-bold tracking-wide">
          Loading...
        </div>
      </div>
    );
  }

  if (isAdminMode) {
    return (
      <AdminPanel
        users={users}
        onClose={() => setIsAdminMode(false)}
        onDeleteUserDeep={onDeleteUserDeep}
        onResetAllRatings={onResetAllRatings}
        onClearAllUserData={onClearAllUserData}
        appStats={appStats}
        onApplyDemoStats={applyDemoStats}
        onRestoreFromBackup={restoreFromBackup}
      />
    );
  }

  return (
    <>
      <MainContent
        currentUser={currentUser}
        users={users}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogoutUser}
        chartjsConstructor={chartjsConstructorRef.current}
        isChartJsLoaded={isChartJsLoaded}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      {/* 認証モーダル */}
      <UnifiedAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onAdminLogin={() => setIsAdminMode(true)}
        onSuccess={() => { setActiveTab("diagnosis"); }}
      />
      {/* プロフィール設定モーダル（アカウント削除対応） */}
      {currentUser && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          users={users}
          onSubmit={(nextName, nextPassword, nextIcon) => updateCurrentUser(nextName, nextPassword, nextIcon)}
          onDeleteCurrentUser={handleDeleteOwnAccount}
        />
      )}
    </>
  );
};

export default function Page() {
  return <DigitalWellbeingApp />;
}