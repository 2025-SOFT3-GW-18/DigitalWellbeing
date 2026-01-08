
"use client";
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";

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
}
interface PendingResult {
  date: string;
  score: number;
  level: string;
  recommendation: string;
}

type HobbyCost = "free" | "low" | "mid" | "high";
type HobbyPlace = "indoor" | "outdoor";
interface Hobby {
  id: string;
  name: string;
  description: string;
  minutes: number;
  place: HobbyPlace;
  firstStep: string;
  supplies?: string[];
  cost: HobbyCost;
  icon?: string;
 difficulty?: "初級" | "中級" | "上級";
}

interface AppStat {
  id: string;
  name: string;
  category: "gamification" | "lock" | "family";
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

type AddictionTypeId = "sns" | "game" | "habit" | "work";
interface AddictionType {
  id: AddictionTypeId;
  name: string;
  icon: string;
  description: string;
  advice: string;
  recommendedCategories: string[];
  recommendedAppIds: string[];
  recommendedHobbies?: Hobby[];
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
 追加: 掲示板（ローカル）型定義
=============================================== */
type BoardVisibility = "nickname" | "anonymous";
interface BoardThread {
  id: string;
  title: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
}
interface BoardPost {
  id: string;
  threadId: string;
  // 返信機能は使わない方針だが、既存データ互換のため残す
  parentId?: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  authorUserId: string;
  visibility: BoardVisibility;
}
interface BoardProfile {
  displayName: string;
  // 互換のため保持（UIでは保存ボタンを出さない）
  defaultVisibility: BoardVisibility;
  icon: string;
}


/* ===============================================
 2. 定数・データ
=============================================== */
const USER_ICONS = [  "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐯","🦁","🐮","🐷","🐵","🐺","🐻‍❄️","🐨"
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

const ADDICTION_TYPES: Record<AddictionTypeId, AddictionType> = {
  sns: {
    id: "sns",
    name: "SNS・承認欲求タイプ",
    icon: "🐰",
    description: "「いいね」や返信が気になり、常に誰かと繋がっていないと不安になるタイプです。",
    advice: "通知を完全にオフにする時間を設けるか、強制的にアプリをロックするツールが有効です。",
    recommendedCategories: ["lock"],
    recommendedAppIds: ["detox", "stayfree"],
    recommendedHobbies: [
    // 難易度: 初級 / コスト: low / 選定理由: 通知・タイムラインの割り込みを断てるため。
    { id: "reading", icon: "📖", name: "読書", description: "通知が来ない世界で、著者の思考に深く潜れる。", minutes: 20, place: "indoor", supplies: ["紙の本", "しおり"], firstStep: "本を手に取って冒頭を読む", cost: "low", difficulty: "初級" },
    // 難易度: 初級 / コスト: free / 選定理由: 環境を変えると「手が伸びる癖」を断ち切りやすい。
    { id: "evening_walk", icon: "🚶", name: "散歩・ウォーキング", description: "外へ出るだけで行動の流れが変わり、スマホの無意識チェックが起きにくくなる。", minutes: 20, place: "outdoor", supplies: ["歩きやすい靴"], firstStep: "上着を着て家の周りを歩く", cost: "free", difficulty: "初級" },
    // 難易度: 初級 / コスト: low / 選定理由: 受信（スクロール）をアウトプット（書く）へ置換できる。
    { id: "journaling", icon: "📝", name: "日記・ジャーナリング", description: "手書きで感情を外に出し、情報過多の脳をリセットする。", minutes: 10, place: "indoor", supplies: ["ノート", "ペン"], firstStep: "ノートを開いて今日の気分を書く", cost: "low", difficulty: "初級" },
    // 難易度: 初級 / コスト: free / 選定理由: 衝動に気づいて止める練習になり、反射的なチェックを減らしやすい。
    { id: "mindfulness_meditation", icon: "🧘", name: "マインドフルネス瞑想", description: "「今、ここ」に集中する訓練で、スマホへの衝動をやり過ごす力を作る。", minutes: 8, place: "indoor", firstStep: "椅子に座って目を閉じ呼吸を数える", cost: "free", difficulty: "初級" },
    // 難易度: 初級 / コスト: free / 選定理由: 画面刺激の代替になり、手が塞がってスマホを触りにくい。
    { id: "radio_listening", icon: "📻", name: "ラジオを聴く", description: "耳だけ使い、目を休ませつつ家事などに集中できる。", minutes: 15, place: "indoor", supplies: ["ラジオ"], firstStep: "ラジオを流して洗い物を片づける", cost: "low", difficulty: "初級" },
  ],
  },
  game: {
    id: "game",
    name: "ゲーム・没頭タイプ",
    icon: "🎮",
    description: "達成感や没頭を求めて、長時間ゲームや動画に入り込んでしまうタイプです。",
    advice: "『やめる』こと自体をゲーム化するアプリや、育成要素のあるツールで置き換えましょう。",
    recommendedCategories: ["gamification"],
    recommendedAppIds: ["forest", "focus_quest"],
    recommendedHobbies: [
    // 難易度: 中級 / コスト: mid / 選定理由: 刺激を「完成の達成感」へ置換できる。
    { id: "cooking", icon: "🍳", name: "料理・お菓子作り", description: "両手が塞がり、段取りに集中するためスマホを忘れやすい。", minutes: 45, place: "indoor", supplies: ["食材", "調理器具"], firstStep: "朝ごはんにスクランブルエッグを作る", cost: "mid", difficulty: "中級" },
    // 難易度: 中級 / コスト: low / 選定理由: 1タスクに集中しやすく、終わりを決められる。
    { id: "jigsaw_puzzle", icon: "🧩", name: "ジグソーパズル", description: "視覚情報を整理する快感が、スクロールの代替になる。", minutes: 30, place: "indoor", supplies: ["ジグソーパズル"], firstStep: "角と縁を分けて並べる", cost: "low", difficulty: "中級" },
    // 難易度: 中級 / コスト: low / 選定理由: 手が塞がり、単純反復で没頭しやすい。
    { id: "adult_coloring", icon: "🎨", name: "塗り絵", description: "色選びと塗りの反復がフローを作り、スマホの“次々”を止めやすい。", minutes: 25, place: "indoor", supplies: ["塗り絵", "色鉛筆/ペン"], firstStep: "色鉛筆を出して好きな所から塗る", cost: "low", difficulty: "中級" },
    // 難易度: 中級 / コスト: mid / 選定理由: 手の占有＋達成感で動画/ゲームの連続を断ちやすい。
    { id: "model_build", icon: "🛠️", name: "プラモデル制作", description: "指先作業でスマホ操作が物理的に難しく、没頭しやすい。", minutes: 40, place: "indoor", supplies: ["プラモデル", "ニッパー", "やすり"], firstStep: "部品を外して合わせて組み立てる", cost: "mid", difficulty: "中級" },
    // 難易度: 上級 / コスト: high / 選定理由: 高い集中と上達実感があり、スマホの報酬系を上書きしやすい。
    { id: "instrument_practice", icon: "🎸", name: "楽器演奏", description: "練習に集中が必要で、通知音すら邪魔になる。上達が報酬になる。", minutes: 60, place: "indoor", supplies: ["楽器", "チューナー"], firstStep: "楽器を出して音を出す練習を始める", cost: "high", difficulty: "上級" },
  ],
  },
  habit: {
    id: "habit",
    name: "無意識・習慣タイプ",
    icon: "👻",
    description: "目的がないのに手持ち無沙汰で無意識にスマホを触ってしまうタイプです。",
    advice: "触った瞬間の『気づき』や、利用時間の可視化ツールを取り入れましょう。",
    recommendedCategories: ["gamification", "lock"],
    recommendedAppIds: ["fish", "ubhind", "stop"],
    recommendedHobbies: [
    // 難易度: 初級 / コスト: free / 選定理由: 物理的に触れない時間を作れる。
    { id: "tidy", icon: "🧹", name: "掃除・断捨離", description: "動き回り手が塞がるため、スマホを触る余裕がなくなる。", minutes: 15, place: "indoor", supplies: ["ゴミ袋"], firstStep: "ゴミ袋を出して机の上を片づける", cost: "free", difficulty: "初級" },
    // 難易度: 初級 / コスト: free / 選定理由: 最短で始められ、衝動のピーク（数分）をやり過ごしやすい。
    { id: "stretch", icon: "🤸", name: "ストレッチ", description: "画面で固まった体をほぐし、身体感覚に意識を戻す。", minutes: 5, place: "indoor", supplies: ["ヨガマット"], firstStep: "肩を回して首を横に倒して伸ばす", cost: "free", difficulty: "初級" },
    // 難易度: 中級 / コスト: mid / 選定理由: “世話”の行動が手持ち無沙汰の置換になる。
    { id: "plant", icon: "🪴", name: "観葉植物の世話", description: "成長という「ゆっくりした時間」を楽しみ、速い刺激から距離を取る。", minutes: 10, place: "indoor", supplies: ["観葉植物", "ジョウロ"], firstStep: "土を触って乾いていたら水をやる", cost: "mid", difficulty: "中級" },
    // 難易度: 中級 / コスト: high / 選定理由: 手が塞がり、完成物が残る強い報酬で置換できる。
    { id: "pottery_class", icon: "🏺", name: "陶芸・日曜大工", description: "作る喜びが「消費するだけ」の時間を上回り、没頭できる。", minutes: 90, place: "indoor", supplies: ["エプロン", "軍手"], firstStep: "教室を探して体験予約を入れる", cost: "high", difficulty: "中級" },
    // 難易度: 上級 / コスト: mid / 選定理由: 運動＋攻略で没頭し、スマホに意識が向きにくい。
    { id: "climbing_gym", icon: "🧗", name: "ボルダリング", description: "全身を使う課題攻略で頭がいっぱいになり、スマホから離れやすい。", minutes: 75, place: "indoor", supplies: ["動きやすい服", "靴下"], firstStep: "初心者講習を予約して受付で案内を聞いて登る", cost: "mid", difficulty: "上級" },
  ],
  },
  work: {
    id: "work",
    name: "仕事・強迫観念タイプ",
    icon: "💼",
    description: "休日や夜間でも情報や連絡が気になって脳が休まらないタイプです。",
    advice: "時間帯で区切る、デバイスを物理的に離すなどの強い遮断が有効です。",
    recommendedCategories: ["family", "lock"],
    recommendedAppIds: ["screentime", "detox"],
    recommendedHobbies: [
    // 難易度: 中級 / コスト: mid / 選定理由: 確認衝動を「目的ある学習」へ置換できる。
    { id: "study_paper", icon: "📚", name: "資格・語学の勉強", description: "紙の教材なら通知がなく、集中しやすい。進捗が可視化され安心感も増える。", minutes: 30, place: "indoor", supplies: ["紙の参考書", "ノート", "ペン"], firstStep: "参考書を開いて目次から読む", cost: "mid", difficulty: "中級" },
    // 難易度: 中級 / コスト: mid / 選定理由: 環境強制でデバイスフリー時間を確保できる。
    { id: "movie_theater", icon: "🎬", name: "映画鑑賞", description: "上映中はスマホを触りにくい環境。強制的に“遮断”ができる。", minutes: 140, place: "indoor", supplies: ["チケット"], firstStep: "席に座って作品に集中する", cost: "mid", difficulty: "中級" },
    // 難易度: 上級 / コスト: high / 選定理由: 自然＋移動で注意が外へ向き、確認ループから離れやすい。
    { id: "camping_hiking", icon: "🏕️", name: "キャンプ・登山", description: "自然の中で電波や利便性から距離を取り、脳をデトックスする。", minutes: 180, place: "outdoor", supplies: ["歩きやすい靴", "水", "軽食"], firstStep: "近くの公園で軽食を食べる", cost: "high", difficulty: "上級" },
    // 難易度: 中級 / コスト: mid / 選定理由: 完全遮断＋運動で衝動が下がりやすい。
    { id: "swimming", icon: "🏊", name: "水泳", description: "スマホを持ち込めない環境で、強制的に遮断できる。", minutes: 60, place: "indoor", supplies: ["水着", "タオル", "ゴーグル"], firstStep: "水着とタオルを鞄に入れてプールへ行く", cost: "mid", difficulty: "中級" },
    // 難易度: 中級 / コスト: mid / 選定理由: 強制遮断＋リラックスで仕事の確認ループを断ちやすい。
    { id: "sauna", icon: "🧖", name: "サウナ", description: "スマホを持ち込めない空間で、脳を強制リセットする。", minutes: 70, place: "indoor", supplies: ["タオル", "飲み物"], firstStep: "タオルと飲み物を用意してサウナへ行く", cost: "mid", difficulty: "中級" },
  ],
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
  { id: "focus_quest", name: "Focus Quest", category: "gamification", icon: "🗺️", desc: "集中時間を「冒険」に見立て、目標達成でヒーローを育成.", url: "https://www.google.com/search?q=スマホアプリ+Focus+Quest", successRate: 78, totalVotes: 530, ratings: { effectiveness: 4.0, fun: 5.0, ease: 3.5, continuity: 4.5, design: 4.2 } },
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
 3. ストレージ・初期値・ヘルパー
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
const KEY_PENDING_RESULT = "dw_pending_result";
const KEY_BOARD_THREADS = "dw_board_threads";
const KEY_BOARD_POSTS = "dw_board_posts";
const KEY_BOARD_PROFILE = "dw_board_profile";

const initialTestAnswers = new Array(testQuestions.length).fill(null);
const initialTestScore: number | null = null;
const initialTestResult: { level: string; recommendation: string } | null = null;

const getUserKey = (key: string, userId: string) => `${userId}_${key}`;
const loadFromLocalStorage = <T,>(key: string, defaultValue: T, userId?: string): T => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const storageKey = userId ? getUserKey(key, userId) : key;
    const storedValue = localStorage.getItem(storageKey);
    if (storedValue === null || storedValue === "undefined") return defaultValue;
    const parsed = JSON.parse(storedValue) as T;
    return (parsed === null ? defaultValue : parsed);
  } catch {
    return defaultValue;
  }
};
const saveToLocalStorage = (key: string, value: any, userId?: string) => {
  if (typeof window === "undefined") return;
  try {
    const storageKey = userId ? getUserKey(key, userId) : key;
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {}
};
const removeFromLocalStorage = (key: string, userId?: string) => {
  if (typeof window === "undefined") return;
  try {
    const storageKey = userId ? getUserKey(key, userId) : key;
    localStorage.removeItem(storageKey);
  } catch {}
};
const formatDate = (date: Date): string => date.toISOString().slice(0, 10).replace(/\-/g, "/");

const getResultFromScore = (score: number) => {
  let level = "重度依存";
  let recommendation = "スマートフォンが生活を支配している可能性があります。\n専門家への相談も検討してください。";
  if (score <= 6) { level = "低依存"; recommendation = "健康的な利用習慣が保たれています。\n今のバランスを大切にしてください。"; }
  else if (score <= 14) { level = "軽度依存"; recommendation = "少し依存の傾向が見られます。\n意識的にデジタルデトックスの時間を設けましょう。"; }
  else if (score <= 23) { level = "中度依存"; recommendation = "生活に支障が出始めています。\n具体的な対策を直ちに実行しましょう。"; }
  return { level, recommendation };
};

const getResultStyle = (level: string) => {
  switch (level) {
    case "低依存": return { bg: "bg-green-50", border: "border-green-300", text: "text-green-700", scoreText: "text-green-800", icon: "🌳" };
    case "軽度依存": return { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700", scoreText: "text-yellow-800", icon: "⚠️" };
    case "中度依存": return { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700", scoreText: "text-orange-800", icon: "🔥" };
    case "重度依存": return { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", scoreText: "text-red-800", icon: "🚨" };
    default: return { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700", scoreText: "text-gray-800", icon: "❓" };
  }
};

/* ===============================================
 4. UIユーティリティ
=============================================== */
const PASSWORD_MAX = 64;
const capPassword = (v: string) => v.replace(/[^\x21-\x7E]/g, "").slice(0, PASSWORD_MAX);
const isValidPassword = (v: string) => /^[A-Za-z0-9\x21-\x7E]{8,64}$/.test(v);

const KEYBOARD_SETS = ["0123456789","abcdefghijklmnopqrstuvwxyz","qwertyuiop","asdfghjkl","zxcvbnm"];
const hasTooManyRepeats = (pw: string) => /(.)\1\1\1/.test(pw);
const hasSimpleSequence = (pw: string) => {
  const s = pw.toLowerCase();
  for (const seq of KEYBOARD_SETS) {
    for (let i = 0; i <= seq.length - 4; i++) {
      const sub = seq.slice(i, i + 4);
      const rev = sub.split("").reverse().join("");
      if (s.includes(sub) || s.includes(rev)) return true;
    }
  }
  return false;
};
const COMMON_WEAK = ["password","qwerty","admin","letmein","iloveyou","welcome","monkey","dragon","abc123","111111","123456","123456789","zaq12wsx"];
const hasCommonWeakWord = (pw: string) => COMMON_WEAK.some(w => pw.toLowerCase().includes(w));
const checkWeakPatterns = (pw: string): string | null => {
  if (hasTooManyRepeats(pw)) return "同一文字が4連続するパスワードは使用できません。";
  if (hasSimpleSequence(pw)) return "連番・キーボード配列の単純な並びは使用できません。";
  if (hasCommonWeakWord(pw)) return "一般的に知られた弱い単語を含むパスワードは使用できません。";
  return null;
};
const estimateStrength = (pw: string) => {
  if (!pw) return { score: 0, label: "未入力", percent: 0 };
  if (checkWeakPatterns(pw)) return { score: 0, label: "弱い", percent: 0 };
  if (pw.length <= 8) return { score: 0, label: "弱い", percent: 0 };
  let base = pw.length <= 11 ? 1 : pw.length <= 15 ? 2 : pw.length <= 24 ? 3 : 4;
  const bonuses = (/[A-Z]/.test(pw) ? 1 : 0) + (/[0-9]/.test(pw) ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);
  const score = Math.max(0, Math.min(4, base + bonuses));
  const percent = Math.round((score / 4) * 100);
  const label = score === 0 ? "弱い" : score === 1 ? "やや弱い" : score === 2 ? "ふつう" : score === 3 ? "やや強い" : "強い";
  return { score, label, percent };
};
const PasswordStrengthInline: React.FC<{ password: string }> = ({ password }) => {
  const [view, setView] = useState(estimateStrength(password));
  useEffect(() => setView(estimateStrength(password)), [password]);
  const barColor = view.percent < 25 ? "bg-red-400" : view.percent < 50 ? "bg-orange-400" : view.percent < 75 ? "bg-yellow-400" : "bg-green-500";
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>強度: <b className="text-gray-700">{view.label}</b></span>
        <span>{view.percent}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded">
        <div className={`h-2 ${barColor} rounded`} style={{ width: `${view.percent}%` }} />
      </div>
      {password && checkWeakPatterns(password) && (
        <p className="mt-1 text-[11px] text-red-600 font-bold">{checkWeakPatterns(password)}</p>
      )}
    </div>
  );
};
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

/* ===============================================
 5. グラフ・モーダルなど
=============================================== */
const ResourceChart = ({ type, data, options, plugins, chartjsConstructor, isChartJsLoaded }: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartInstance | null>(null);
  useEffect(() => {
    if (isChartJsLoaded && chartjsConstructor && canvasRef.current) {
      if (chartInstance.current) chartInstance.current.destroy();
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) chartInstance.current = new chartjsConstructor(ctx, { type, data, options, plugins });
    }
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
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
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};



// ===== Chart.js: ドーナツ中央テキスト（円の中心に直接描画してズレを防止） =====
const DoughnutCenterTextPlugin = {
  id: "centerText",
  afterDraw(chart: any) {
    try {
      const meta = chart.getDatasetMeta?.(0);
      const arc = meta?.data?.[0];
      if (!arc) return;
      const ctx = chart.ctx;
      const pluginOpts = chart?.options?.plugins?.centerText ?? {};
      const text = pluginOpts.text ?? "";
      if (!text) return;
      const color = pluginOpts.color ?? "#16a34a";
      const font = pluginOpts.font ?? "800 12px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(text), arc.x, arc.y);
      ctx.restore();
    } catch {
      // noop
    }
  },
};
const IconPicker = ({ value, onChange, heightClass }: { value: string; onChange: (icon: string) => void; heightClass?: string; }) => (
  <div className={`w-full overflow-x-hidden overflow-y-auto ${heightClass ?? "max-h-40"} p-1 rounded-lg bg-white border border-gray-200`}>
    <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(40px,1fr))]">
      {USER_ICONS.map((ic) => (
        <button
          key={ic}
          type="button"
          onClick={() => onChange(ic)}
                    className={`flex items-center justify-center aspect-square rounded-lg border transition leading-none select-none ${value === ic
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

/* --- 投票モーダル --- */
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
    <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center p-4 z-[100]">
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

/* --- プロフィールモーダル --- */
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
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [icon, setIcon] = useState<string>(currentUser?.icon ?? USER_ICONS[0]);

  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name);
      setPassword("");
      setPasswordConfirm("");
      setIcon(currentUser.icon ?? USER_ICONS[0]);
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const newName = name.trim();
    const newPwInput = password.trim();
    const newPwConfirmInput = passwordConfirm.trim();
    const finalPw = newPwInput === "" ? currentUser.password : newPwInput;

    if (!newName) { alert("ユーザー名を入力してください"); return; }
    if (newName.length > 10) { alert("ユーザー名は10文字以内で入力してください"); return; }
    const dup = users.some(u => u.name === newName && u.id !== currentUser.id);
    if (dup) { alert("そのユーザー名は既に使用されています。別の名前を入力してください。"); return; }

    if (newPwInput !== "") {
      if (capPassword(newPwInput) !== capPassword(newPwConfirmInput)) {
        alert("確認用パスワードが一致しません"); return;
      }
      const weakMsg = checkWeakPatterns(newPwInput);
      if (weakMsg) { alert(weakMsg); return; } // 修正: 変数名誤記防止（最終版では "weakMsg" を使用）
    }
    if (!isValidPassword(finalPw)) {
      alert("パスワードは 8～64 文字の「半角英数字記号」のみ利用できます（全角・スペース不可）");
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 relative" onClick={(e) => e.stopPropagation()}>
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          onClick={onClose}
          title="閉じる"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <h3 className="text-xl font-extrabold text-gray-800 mb-3 text-center">アカウント設定</h3>

        <form onSubmit={submit}>
          <label className="block text-sm font-bold text-gray-600 mb-2">ユーザー名（10文字以内）</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 10))}
            className="w-full p-3 border border-gray-300 rounded-lg mb-3"
            placeholder="ユーザー名"
            maxLength={10}
          />

          <label className="block text-sm font-bold text-gray-600 mb-2">パスワード（8～64文字の半角英数字・記号）</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(capPassword(e.target.value))}
            maxLength={PASSWORD_MAX}
            className="w-full p-3 border border-gray-300 rounded-lg mb-1"
            placeholder="********"
          />
          <PasswordStrengthInline password={password} />

          <label className="block text-sm font-bold text-gray-600 mb-2">パスワード（確認）</label>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(capPassword(e.target.value))}
            maxLength={PASSWORD_MAX}
            className="w-full p-3 border border-gray-300 rounded-lg mb-3"
            placeholder="********"
          />

          <label className="block text-sm font-bold text-gray-600 mb-2">アイコン</label>
          <IconPicker value={icon} onChange={setIcon} heightClass="h-24" />

          <button type="submit" className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition">
            更新する
          </button>
        </form>

        <div className="mt-3 pt-3 border-t border-red-200">
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
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [icon, setIcon] = useState<string>(USER_ICONS[0]);

  useEffect(() => {
    if (isOpen) {
      setMode("login");
      setUsername("");
      setPassword("");
      setPasswordConfirm("");
      setIcon(USER_ICONS[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const submitLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = username.trim();
    if (!name) { alert("ユーザー名を入力してください"); return; }
    if (name.length > 10) { alert("ユーザー名は10文字以内で入力してください"); return; }
    if (name === "admin" && password === "admin") { onAdminLogin(); onClose(); onSuccess("login"); return; }
    const ok = onLogin(name, password);
    if (ok) { onClose(); onSuccess("login"); } else alert("ユーザー名またはパスワードが正しくありません");
  };

  const submitRegister = (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = username.trim();
    const pw = capPassword(password);
    const pwc = capPassword(passwordConfirm);
    if (!name) { alert("ユーザー名を入力してください"); return; }
    if (name.length > 10) { alert("ユーザー名は10文字以内で入力してください"); return; }
    if (pw !== pwc) { alert("確認用パスワードが一致しません"); return; }
    if (!isValidPassword(pw)) { alert("パスワードは 8～64 文字の「半角英数字記号」のみ利用できます（全角・スペース不可）"); return; }
    const weakMsg = checkWeakPatterns(pw);
    if (weakMsg) { alert(weakMsg); return; }
    if (!icon) { alert("アイコンを選択してください"); return; }
    const ok = onRegister(name, pw, icon);
    if (ok) { onClose(); onSuccess("register"); }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/70 z-[100000] flex items-center justify-center p-4">
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
              <label className="block text-sm font-bold text-gray-600 mb-2">パスワード（8～64文字の半角英数字・記号）</label>
              <input type="password" value={password} onChange={(e) => setPassword(capPassword(e.target.value))} maxLength={PASSWORD_MAX} className="w-full p-3 border border-gray-300 rounded-lg mb-4" placeholder="********" />
              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition">ログイン</button>
            </form>

            {/*<p className="mt-3 text-xs text-gray-400 text-center">管理者（admin / admin）もこちらからログインできます</p>*/}
            <div className="mt-3 text-center">
              <span className="text-xs text-gray-500 mr-1">アカウントを作成しませんか？</span>
              <button type="button" onClick={() => { setMode("register"); setPassword(""); setPasswordConfirm(""); }} className="text-xs text-indigo-600 underline hover:text-indigo-700">ユーザー登録へ</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-extrabold text-gray-800 mb-4 text-center">ユーザー登録</h3>
            <form onSubmit={submitRegister}>
              <label className="block text-sm font-bold text-gray-600 mb-2">ユーザー名（10文字以内）</label>
              <input value={username} onChange={(e) => setUsername(e.target.value.slice(0, 10))} className="w-full p-3 border border-gray-300 rounded-lg mb-3" placeholder="ユーザー名" maxLength={10} />
              <label className="block text-sm font-bold text-gray-600 mb-2">パスワード（8～64文字の半角英数字・記号）</label>
              <input type="password" value={password} onChange={(e) => setPassword(capPassword(e.target.value))} maxLength={PASSWORD_MAX} className="w-full p-3 border border-gray-300 rounded-lg mb-1" placeholder="********" />
              <PasswordStrengthInline password={password} />
              <label className="block text-sm font-bold text-gray-600 mb-2">パスワード（確認）</label>
              <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(capPassword(e.target.value))} maxLength={PASSWORD_MAX} className="w-full p-3 border border-gray-300 rounded-lg mb-3" placeholder="********" />
              <label className="block text-sm font-bold text-gray-600 mb-2">アイコン</label>
              <IconPicker value={icon} onChange={setIcon} heightClass="h-24" />
              <button type="submit" className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition">登録する</button>
            </form>

            <div className="mt-3 text-center">
              <span className="text-xs text-gray-500 mr-1">すでにアカウントをお持ちですか？</span>
              <button type="button" onClick={() => { setMode("login"); setPassword(""); setPasswordConfirm(""); }} className="text-xs text-indigo-600 underline hover:text-indigo-700">ログインへ</button>
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
    : currentAppStats.map((app) => ({
        ...app,
        successRate: 0,
        totalVotes: 0,
        ratings: { effectiveness: 0, fun: 0, ease: 0, continuity: 0, design: 0 },
      }));

  const userKeys = [KEY_ANSWERS, KEY_SCORE, KEY_RESULT, KEY_HISTORY, KEY_TYPE_RESULT, KEY_ACTIVE_TAB];

  const confirmExecute = () => {
    if (confirm("全ユーザーの診断履歴・結果・タイプを削除します。よろしいですか？")) onExecute();
  };

  const confirmRestore = () => {
    if (confirm("評価データを0件へ初期化します。よろしいですか？")) onRestore();
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
              <button
                onClick={() => setUseDemoPreview(v => !v)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded font-bold transition"
              >
                プレビュー切替
              </button>
            </div>

            <div className="max-h-64 overflow-auto border rounded p-3 bg-gray-50">
              {previewStats.map((app) => (
                <div key={app.id} className="text-sm text-gray-700 border-b last:border-b-0 py-2">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">{app.icon}</span>
                    <span className="font-bold">{app.name}</span>
                  </div>
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
              <button onClick={confirmRestore} className="py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold">評価データ初期化</button>
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
              <button onClick={confirmExecute} className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold">
                すべてのユーザーデータを削除する
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* --- アプリカード／リソースセクション --- */
const AppCard = ({ app, chartjsConstructor, isChartJsLoaded, onOpenSurvey }: any) => {
  const pieData = { labels: ["成功", "失敗"], datasets: [{ data: [app.successRate, 100 - app.successRate], backgroundColor: ["#4ade80", "#e5e7eb"], borderWidth: 0 }] };
  const pieOptions = {
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      // ✅ 中央表示（Chart.jsの中心に描画）
      centerText: { text: `${app.successRate}%`, color: "#16a34a", font: "800 12px system-ui, -apple-system, Segoe UI, sans-serif" },
    },
    maintainAspectRatio: false,
  };
  const radarData = {
    labels: ["効果", "楽しさ", "手軽さ", "継続性", "デザイン"],
    datasets: [{ label: "評価", data: [app.ratings.effectiveness, app.ratings.fun, app.ratings.ease, app.ratings.continuity, app.ratings.design], backgroundColor: "rgba(99, 102, 241, 0.2)", borderColor: "rgba(99, 102, 241, 1)", borderWidth: 1, pointBackgroundColor: "rgba(99, 102, 241, 1)", pointRadius: 1 }]
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
            <ResourceChart type="doughnut" data={pieData} options={pieOptions} plugins={[DoughnutCenterTextPlugin]} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} />
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
    <div className="space-y-6" data-board-root="true">
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



/* ===============================================
 追加: 掲示板（ローカル / スレッド型）
  - 用途ベースタグ（複数選択・上限なし）
  - 返信機能は使わない（フラット投稿のみ：parentIdを作らない/返信ボタンなし）
  - アイコン：ユーザー登録と同じ動物アイコンから選択（初期はログイン中のアイコン）
  - スレッド作成時にも「アイコン・名前」を入力可能（投稿フォームと同じ掲示板プロフィールを編集）
  - 自分の投稿が分かる表示（バッジ＋色）
  - 時刻表示は日本時間（Asia/Tokyo）
=============================================== */


// ===== 掲示板：投稿編集インライン（IME入力が途切れないように BoardSection の外へ） =====
type PostEditorInlineProps = {
  editingBody: string;
  setEditingBody: (v: string) => void;
  focusCls: string;
  onCancel: () => void;
  onSave: () => void;
};
const PostEditorInline: React.FC<PostEditorInlineProps> = ({
  editingBody,
  setEditingBody,
  focusCls,
  onCancel,
  onSave,
}) => (
  <div className="mt-2">
    <textarea
      value={editingBody}
      onChange={(e) => setEditingBody(e.target.value)}
      className={`w-full p-3 border border-gray-300 rounded-lg min-h-[120px] ${focusCls}`}
      maxLength={800}
      aria-label="編集本文"
    />
    <div className="mt-2 flex items-center justify-between text-xs text-gray-500 font-bold">
      <span>{editingBody.length} / 800</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={onSave}
          className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          保存
        </button>
      </div>
    </div>
  </div>
);

// ===== 掲示板：投稿行（IME入力が途切れないように BoardSection の外へ） =====
type RenderPostRowProps = {
  post: BoardPost;
  currentUser: User | null;
  selectedThread: BoardThread | null;
  no: number;
  highlightPostId: string | null;
  resolveAuthorIcon: (p: BoardPost) => string;
  resolveAuthorLabel: (p: BoardPost) => string;
  fmtJst: (iso?: string) => string;
  editingId: string | null;
  editingBody: string;
  setEditingId: (v: string | null) => void;
  setEditingBody: (v: string) => void;
  updatePost: (postId: string, nextBody: string) => void;
  deletePost: (postId: string) => void;
  focusCls: string;
};

const RenderPostRow: React.FC<RenderPostRowProps> = ({
  post,
  currentUser,
  selectedThread,
  no,
  highlightPostId,
  resolveAuthorIcon,
  resolveAuthorLabel,
  fmtJst,
  editingId,
  editingBody,
  setEditingId,
  setEditingBody,
  updatePost,
  deletePost,
  focusCls,
}) => {
  const isMine = !!currentUser && post.authorUserId === currentUser.id;
  const isOwnerPost = !!selectedThread && post.authorUserId === selectedThread.createdByUserId;
  const wrapCls = isMine
    ? "p-4 rounded-xl border border-indigo-200 bg-gray-50"
    : "p-4 rounded-xl border border-gray-200 bg-gray-50";

  return (
    <div id={`dwpost-${post.id}`}>
      <div className={`${wrapCls} ${highlightPostId === post.id ? "ring-2 ring-indigo-400" : ""}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-xs text-gray-700 font-extrabold">
              No.{no} ・ {resolveAuthorIcon(post)} {resolveAuthorLabel(post)}
              {isMine ? (
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-indigo-600 text-white font-extrabold">自分</span>
              ) : null}
              {isOwnerPost ? (
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-extrabold">スレ主</span>
              ) : null}
              <span className="ml-2 text-gray-400 font-bold">{fmtJst(post.updatedAt ?? post.createdAt)}</span>
              {post.updatedAt ? <span className="ml-2 text-xs text-gray-400">（編集済み）</span> : null}
            </p>
          </div>

          {isMine && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingId(post.id);
                  setEditingBody(post.body);
                  // ✅スクロールさせない（編集ボタンで画面が動かないように）
                }}
                className="text-xs px-3 py-1.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-bold hover:bg-amber-100 transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-amber-200"
              >
                編集
              </button>
              <button
                type="button"
                onClick={() => deletePost(post.id)}
                className="text-xs px-3 py-1.5 rounded bg-red-50 border border-red-200 text-red-700 font-bold hover:bg-red-100 transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                削除
              </button>
            </div>
          )}
        </div>

        {editingId === post.id ? (
          <PostEditorInline
            editingBody={editingBody}
            setEditingBody={setEditingBody}
            focusCls={focusCls}
            onCancel={() => {
              setEditingId(null);
              setEditingBody("");
            }}
            onSave={() => {
              updatePost(post.id, editingBody);
              setEditingId(null);
              setEditingBody("");
            }}
          />
        ) : (
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{post.body}</p>
        )}
      </div>
    </div>
  );
};


// ===== 掲示板：新規スレッド作成フォーム（BoardSection の外へ移動して再マウントを防止） =====
type ThreadCreateBoxProps = {
  currentUser: User | null;
  profile: BoardProfile;
  setProfile: React.Dispatch<React.SetStateAction<BoardProfile>>;
  focusCls: string;
  TAG_OPTIONS: { id: string; label: string }[];
  tagToggleBtnClass: (tagId: string, active: boolean) => string;
  toggleTag: (arr: string[], tagId: string) => string[];
  onRequireLogin: () => void;
  createThread: (title: string, tags: string[]) => void;
  setIsCreateOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const ThreadCreateBox: React.FC<ThreadCreateBoxProps> = ({
  currentUser,
  profile,
  setProfile,
  focusCls,
  TAG_OPTIONS,
  tagToggleBtnClass,
  toggleTag,
  onRequireLogin,
  createThread,
  setIsCreateOpen,
}) => {
  const [isComposingName, setIsComposingName] = React.useState(false);
  const [displayNameDraft, setDisplayNameDraft] = React.useState(profile.displayName ?? "");
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (isComposingName) {
      setDisplayNameDraft(next);
      return;
    }
    setDisplayNameDraft(next.slice(0, 10));
  };
  const handleDisplayNameCompositionStart = () => setIsComposingName(true);
  const handleDisplayNameCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposingName(false);
    const v = (e.currentTarget.value ?? "").slice(0, 10);
    setDisplayNameDraft(v);
  };

  const [title, setTitle] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [showIconPickerThread, setShowIconPickerThread] = React.useState<boolean>(false);

  return (
    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
      <p className="text-xs text-gray-600 font-bold mb-2">新規スレッド作成（ログイン必須）</p>
      {currentUser && (
        <div className="mb-3 p-3 rounded-lg bg-white border border-gray-200">
          <p className="text-xs text-gray-600 font-bold mb-2">作成者情報（掲示板プロフィール）</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-500 font-bold text-xs">アイコン</span>
            <button
              type="button"
              onClick={() => setShowIconPickerThread((v) => !v)}
              className="w-10 h-10 rounded-lg bg-white border border-gray-300 flex items-center justify-center text-xl hover:bg-gray-50 transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-200"
              title="アイコンを選ぶ"
            >
              {profile.icon}
            </button>
            <span className="text-gray-500 font-bold text-xs">表示名</span>
            <input
              value={displayNameDraft}
              onChange={handleDisplayNameChange}
              className={`p-2 border border-gray-300 rounded ${focusCls}`}
              placeholder="ニックネーム"
              maxLength={10}
              onCompositionStart={handleDisplayNameCompositionStart}
              onCompositionEnd={handleDisplayNameCompositionEnd}
              aria-label="表示名"
              onBlur={() => setProfile((prev) => ({ ...prev, displayName: displayNameDraft.slice(0, 10) }))}
            />
            <span className="text-gray-400">（最大10文字）</span>
            <span className="text-xs text-gray-400">※投稿フォームにも同じ設定が反映されます</span>
          </div>
          {showIconPickerThread && (
            <div className="mt-3 p-3 rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="grid grid-cols-8 gap-2">
                {USER_ICONS.map((ic) => {
                  const active = profile.icon === ic;
                  return (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => {
                        setProfile((prev) => ({ ...prev, icon: ic }));
                        setShowIconPickerThread(false);
                      }}
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center text-xl transition active:scale-[0.99] ${active ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                    >
                      {ic}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <label className="block text-sm font-bold text-gray-600 mb-2">スレッドタイトル（最大20文字）</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        readOnly={!currentUser}
        onMouseDown={(e) => {
          if (!currentUser) {
            e.preventDefault();
            alert("投稿するにはログインが必要です。");
          }
        }}
        onFocus={(e) => {
          if (!currentUser) {
            alert("投稿するにはログインが必要です。");
            try { (e.target as HTMLInputElement).blur(); } catch {}
          }
        }}
        placeholder="例：寝る前のスマホをやめたい"
        className={`w-full p-3 border border-gray-300 rounded-lg ${focusCls}`}
        maxLength={20}
        aria-label="スレッドタイトル"
      />

      <div className="mt-3">
        <p className="text-xs text-gray-600 font-bold mb-2">タグ（複数選択可・上限なし）</p>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((t) => {
            const active = tags.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTags((prev) => toggleTag(prev, t.id))}
                className={tagToggleBtnClass(t.id, active)}
                aria-pressed={active}
              >
                {active && (
                  <span className="mr-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/70 border border-white">✓</span>
                )}
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-500">※未選択の場合はタグなしのまま作成されます。</p>
      </div>

      <div className="mt-4 flex items-center justify-end">
        <button
          onClick={() => {
            if (!currentUser) { onRequireLogin(); return; }
            if (!title.trim()) { alert("タイトルを入力して下さい"); return; }
            const dn = displayNameDraft.trim();
            if (!dn) { alert("ニックネームを入力してください"); return; }
            setProfile((prev) => ({ ...prev, defaultVisibility: "nickname", displayName: dn.slice(0, 10) }));
            createThread(title, tags);
            setTitle("");
            setTags([]);
            setIsCreateOpen(false);
          }}
          className={`px-4 py-3 rounded-lg font-bold transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-indigo-600 text-white hover:bg-indigo-700`}
        >
          {currentUser ? "作成" : "ログインして作成"}
        </button>
      </div>
    </div>
  );
};

// ===== 掲示板：投稿フォーム（BoardSection の外へ移動して再マウントを防止） =====
type PostComposerProps = {
  currentUser: User | null;
  onRequireLogin: () => void;
  profile: BoardProfile;
  setProfile: React.Dispatch<React.SetStateAction<BoardProfile>>;
  selectedThread: BoardThread | null;
  addPost: (threadId: string, body: string, visibility: BoardVisibility) => void;
  showIconPicker: boolean;
  setShowIconPicker: React.Dispatch<React.SetStateAction<boolean>>;
  composerRef: React.RefObject<HTMLDivElement | null>;
  focusCls: string;
};

const PostComposer: React.FC<PostComposerProps> = ({
  currentUser,
  onRequireLogin,
  profile,
  setProfile,
  selectedThread,
  addPost,
  showIconPicker,
  setShowIconPicker,
  composerRef,
  focusCls,
}) => {
  const [isComposingName, setIsComposingName] = React.useState(false);
  const [displayNameDraft, setDisplayNameDraft] = React.useState(profile.displayName ?? "");
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (isComposingName) {
      setDisplayNameDraft(next);
      return;
    }
    setDisplayNameDraft(next.slice(0, 10));
  };
  const handleDisplayNameCompositionStart = () => setIsComposingName(true);
  const handleDisplayNameCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposingName(false);
    const v = (e.currentTarget.value ?? "").slice(0, 10);
    setDisplayNameDraft(v);
  };

  const [body, setBody] = React.useState("");

  return (
    <div ref={composerRef} className="mt-6 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-extrabold text-gray-800">投稿フォーム</p>
        <span className="text-xs text-gray-400 font-bold">新規投稿</span>
      </div>

      {currentUser && (
        <div className="mt-3 flex items-center gap-3 text-xs flex-wrap">
          <span className="text-gray-500 font-bold">アイコン</span>
          <button
            type="button"
            onClick={() => setShowIconPicker((v) => !v)}
            className="w-10 h-10 rounded-lg bg-white border border-gray-300 flex items-center justify-center text-xl hover:bg-gray-50 transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-200"
            title="アイコンを選ぶ"
          >
            {profile.icon}
          </button>

          <span className="text-gray-500 font-bold">表示名</span>
          <input
            value={displayNameDraft}
            onChange={handleDisplayNameChange}
            className={`p-2 border border-gray-300 rounded ${focusCls}`}
            placeholder="ニックネーム"
            maxLength={10}
            onCompositionStart={handleDisplayNameCompositionStart}
            onCompositionEnd={handleDisplayNameCompositionEnd}
            aria-label="表示名"
            onBlur={() => setProfile((prev) => ({ ...prev, displayName: displayNameDraft.slice(0, 10) }))}
          />
          <span className="text-gray-400">（最大10文字）</span>

          {showIconPicker && (
            <div className="p-3 rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="grid grid-cols-8 gap-2">
                {USER_ICONS.map((ic) => {
                  const active = profile.icon === ic;
                  return (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => {
                        setProfile((prev) => ({ ...prev, icon: ic }));
                        setShowIconPicker(false);
                      }}
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center text-xl transition active:scale-[0.99] ${active ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                    >
                      {ic}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        readOnly={!currentUser}
        onMouseDown={(e) => {
          if (!currentUser) {
            e.preventDefault();
            alert("投稿するにはログインが必要です。");
          }
        }}
        onFocus={(e) => {
          if (!currentUser) {
            alert("投稿するにはログインが必要です。");
            try { (e.target as HTMLTextAreaElement).blur(); } catch {}
          }
        }}
        placeholder="質問・相談・共有など（800文字まで）"
        className={`mt-3 w-full p-3 border border-gray-300 rounded-lg min-h-[120px] ${focusCls}`}
        maxLength={800}
        aria-label="本文"
      />

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 font-bold">
        <span>{body.length} / 800</span>

        {!currentUser ? (
          <button
            onClick={onRequireLogin}
            className="px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            ログインして投稿
          </button>
        ) : (
          <button
            onClick={() => {
              if (!selectedThread) return;
              const textBody = body.trim();
              if (!textBody) { alert("本文を入力してください"); return; }
              const dn = displayNameDraft.trim();
              if (!dn) { alert("ニックネームを入力してください"); return; }
              setProfile((prev) => ({ ...prev, displayName: dn.slice(0, 10) }));
              addPost(selectedThread.id, body, "nickname");
              setBody("");
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            投稿
          </button>
        )}
      </div>
    </div>
  );
};
const BoardSection: React.FC<{ currentUser: User | null; onRequireLogin: () => void }> = ({ currentUser, onRequireLogin }) => {
  const TAG_OPTIONS: { id: string; label: string }[] = [
  { id: "question", label: "質問" },
  { id: "consult", label: "相談" },
  { id: "report", label: "報告" },
  { id: "success", label: "成功" },
  { id: "fail", label: "失敗" },
  { id: "chat", label: "雑談" },
  { id: "recommend", label: "おすすめ" },
  { id: "tool", label: "ツール" },
  { id: "setting", label: "設定" },
  { id: "other", label: "その他" },
];

  const focusCls = "focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300";

  const [threads, setThreads] = useState<BoardThread[]>(loadFromLocalStorage<BoardThread[]>(KEY_BOARD_THREADS, []));
  const [posts, setPosts] = useState<BoardPost[]>(loadFromLocalStorage<BoardPost[]>(KEY_BOARD_POSTS, []));

  const [profile, setProfile] = useState<BoardProfile>(() => {
    if (!currentUser) return { displayName: "Guest", defaultVisibility: "nickname", icon: "👤" };
    return loadFromLocalStorage<BoardProfile>(
      KEY_BOARD_PROFILE,
      { displayName: currentUser.name, defaultVisibility: "nickname", icon: currentUser.icon },
      currentUser.id
    );
  });

  // 一覧UI
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showMineThreadsOnly, setShowMineThreadsOnly] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const PAGE_SIZE = 30;

  // 詳細UI
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const selectedThread = threads.find((t) => t.id === selectedThreadId) ?? null;
  const isThreadOwner = !!currentUser && !!selectedThread && selectedThread.createdByUserId === currentUser.id;

  // スレッド編集（スレ主のみ）
  const [isEditingThread, setIsEditingThread] = useState<boolean>(false);
  const [threadTitleDraft, setThreadTitleDraft] = useState<string>("");
  const [threadTagsDraft, setThreadTagsDraft] = useState<string[]>([]);

  // 投稿編集 状態
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState<string>("");
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);
  const [showMineOnly, setShowMineOnly] = useState<boolean>(false);

  // アイコンピッカー（投稿フォーム側）
  const [showIconPicker, setShowIconPicker] = useState<boolean>(false);

  const composerRef = useRef<HTMLDivElement | null>(null);

  // スレッド一覧へスクロールするための参照
  const threadListRef = useRef<HTMLDivElement | null>(null);
  // ✅ スレッド詳細から戻ったとき、一覧のスクロール位置を復元する
  const listScrollPosRef = useRef<{ isWindow: boolean; top: number } | null>(null);
  const lastViewedThreadIdRef = useRef<string | null>(null);
  // 新規スレッド作成フォームへスクロールするための参照
  const createBoxRef = useRef<HTMLDivElement | null>(null);

  // ✅ 開いたときに"1回だけ"スクロールするためのフラグ
  const didScrollToCreateRef = useRef(false);

  useEffect(() => {
    if (!isCreateOpen) {
      // 閉じたら次回のためにリセット
      didScrollToCreateRef.current = false;
      return;
    }
    if (didScrollToCreateRef.current) return;
    didScrollToCreateRef.current = true;

    // レイアウト確定後に1回だけスクロール（2フレーム待つと安定）
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToCreateBox();
      });
    });
  }, [isCreateOpen]);


  useEffect(() => saveToLocalStorage(KEY_BOARD_THREADS, threads), [threads]);
  useEffect(() => saveToLocalStorage(KEY_BOARD_POSTS, posts), [posts]);
  useEffect(() => {
    if (currentUser) saveToLocalStorage(KEY_BOARD_PROFILE, profile, currentUser.id);
  }, [profile, currentUser]);

  // スレッド切替時に状態リセット
  useEffect(() => {
    setEditingId(null);
    setEditingBody("");
    setHighlightPostId(null);
    setShowMineOnly(false);
  }, [selectedThreadId]);

  // スレッド詳細に入ったら、画面を先頭から表示（スクロール位置をトップへ）
  useEffect(() => {
    if (!selectedThreadId) return;
    if (typeof window === "undefined") return;
    requestAnimationFrame(() => {
      // 1) window をトップへ
      try { window.scrollTo({ top: 0, behavior: "auto" }); } catch { try { window.scrollTo(0, 0); } catch {} }

      // 2) 内側スクロールコンテナがある場合にもトップへ
      try {
        const root = document.querySelector('[data-board-root="true"]') as HTMLElement | null;
        if (!root) return;
        let p: HTMLElement | null = root.parentElement;
        while (p) {
          const st = window.getComputedStyle(p);
          const oy = st.overflowY;
          if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) {
            p.scrollTo({ top: 0, behavior: "auto" });
            break;
          }
          p = p.parentElement;
        }
      } catch {}
    });
  }, [selectedThreadId]);


  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (!selectedThread) return;
    setIsEditingThread(false);
    setThreadTitleDraft(selectedThread.title);
    setThreadTagsDraft(selectedThread.tags ?? []);
  }, [selectedThread]);

  const makeId = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c: any = (globalThis as any).crypto;
      if (c?.randomUUID) return c.randomUUID();
    } catch {}
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  // 日本時間で表示
  const fmtJst = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return iso.slice(0, 16).replace(/-/g, "/").replace("T", " ");
    }
  };

  const requireLogin = () => {
    alert("投稿するにはログインが必要です。");
    onRequireLogin();
  };

  const scrollToComposer = () => {
    const el = composerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      try { el.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {}
    });
  };

  // 指定位置へ『1スクロール（1画面）上』にオフセットして移動（スクロールコンテナ対応）
  const getScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
    if (!node || typeof window === 'undefined') return window;
    let p: HTMLElement | null = node.parentElement;
    while (p) {
      const style = window.getComputedStyle(p);
      const oy = style.overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p;
      p = p.parentElement;
    }
    return window;
  };

  const scrollOnePageAbove = (el: HTMLElement | null) => {
    if (!el || typeof window === 'undefined') return;
    requestAnimationFrame(() => {
      try {
        const scroller = getScrollParent(el);
        if (scroller === window) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          const target = Math.max(0, top - window.innerHeight);
          window.scrollTo({ top: target, behavior: 'smooth' });
          return;
        }
        const parent = scroller as HTMLElement;
        const parentTop = parent.getBoundingClientRect().top;
        const elTop = el.getBoundingClientRect().top;
        const within = elTop - parentTop + parent.scrollTop;
        const target = Math.max(0, within - parent.clientHeight);
        parent.scrollTo({ top: target, behavior: 'smooth' });
      } catch {
        // noop
      }
    });
  };
  const scrollToThreadList = () => scrollOnePageAbove(threadListRef.current);
  // ✅ スレッド詳細から一覧へ戻ったとき、直前のスクロール位置へ復元
  // ちらつき（一覧が一瞬先頭表示される）を避けるため useLayoutEffect で描画前に復元します
  useLayoutEffect(() => {
    if (selectedThreadId !== null) return;
    const saved = listScrollPosRef.current;
    if (!saved || typeof window === "undefined") return;

    try {
      const el = threadListRef.current;
      let scroller: HTMLElement | Window = window;

      // 現在のスクロール親（window or 内側スクロールコンテナ）を再取得
      if (el) {
        let p: HTMLElement | null = el.parentElement;
        while (p) {
          const st = window.getComputedStyle(p);
          const oy = st.overflowY;
          if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) {
            scroller = p;
            break;
          }
          p = p.parentElement;
        }
      }

      if (saved.isWindow || scroller === window) {
        window.scrollTo({ top: saved.top, behavior: "auto" });
      } else {
        (scroller as HTMLElement).scrollTo({ top: saved.top, behavior: "auto" });
      }

      // 直前に見ていたスレッドが画面外なら、位置を大きく崩さずに可視化（必要時のみ）
      const tid = lastViewedThreadIdRef.current;
      if (tid) {
        const node = document.getElementById(`dwthread-${tid}`);
        if (node) {
          const r = node.getBoundingClientRect();
          if (r.top < 0 || r.bottom > window.innerHeight) {
            try { node.scrollIntoView({ block: "center", behavior: "auto" }); } catch { /* noop */ }
          }
        }
      }
    } catch {
      // noop
    }
  }, [selectedThreadId]);
  
const scrollToCreateBox = () => {
  const el = createBoxRef.current;
  if (!el || typeof window === "undefined") return;

  // ✅ 真ん中付近に表示（必要なら微調整：+20 で少し下、-20 で少し上）
  const centerOffset = 0;

  const getScrollParentSafe = (node: HTMLElement): HTMLElement | Window => {
    let parent: HTMLElement | null = node.parentElement;
    while (parent) {
      const st = window.getComputedStyle(parent);
      const oy = st.overflowY;
      if ((oy === "auto" || oy === "scroll") && parent.scrollHeight > parent.clientHeight) return parent;
      parent = parent.parentElement;
    }
    return window;
  };

  requestAnimationFrame(() => {
    try {
      const parent = getScrollParentSafe(el);
      const r = el.getBoundingClientRect();

      // ★上にある場合は何もしない（上にスクロールしない）
      if (r.top < 0) return;

      if (parent === window) {
        // windowの中央に合わせる（要素の中心が画面中央へ）
        const elementCenterY = window.scrollY + r.top + r.height / 2;
        const viewportCenterY = window.scrollY + window.innerHeight / 2;
        const target = Math.max(0, window.scrollY + (elementCenterY - viewportCenterY) + centerOffset);
        window.scrollTo({ top: target, behavior: "smooth" });
        return;
      }

      // 内側スクロールコンテナの中央に合わせる
      const p = parent as HTMLElement;
      const parentRect = p.getBoundingClientRect();
      const elementCenterY = (r.top - parentRect.top) + p.scrollTop + r.height / 2;
      const viewportCenterY = p.scrollTop + p.clientHeight / 2;
      const target = Math.max(0, p.scrollTop + (elementCenterY - viewportCenterY) + centerOffset);
      p.scrollTo({ top: target, behavior: "smooth" });
    } catch {
      // noop
    }
  });
};



  const jumpToPost = (postId: string) => {
    const el = document.getElementById(`dwpost-${postId}`);
    if (!el) return;
    setHighlightPostId(postId);
    try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
    setTimeout(() => setHighlightPostId(null), 1400);
  };

  const toggleTag = (arr: string[], tagId: string) => (arr.includes(tagId) ? arr.filter((x) => x !== tagId) : [...arr, tagId]);

  const normalizeTags = (tags: string[]) => {
  const uniq = Array.from(new Set(tags)).filter(Boolean);
  // 未選択なら「タグなし（空配列）」のまま
  return uniq;
};

  const createThread = (title: string, tags: string[]) => {
    if (!currentUser) return alert("投稿するにはログインが必要です。");
    const t = title.trim();
    if (!t) { alert("タイトルを入力して下さい"); return; }
    const now = new Date().toISOString();
    const th: BoardThread = {
      id: makeId(),
      title: t.slice(0, 20),
      tags: normalizeTags(tags),
      createdAt: now,
      updatedAt: now,
      createdByUserId: currentUser.id,
    };
    setThreads((prev) => [th, ...prev]);
    setSelectedThreadId(th.id);
  };

  const updateThread = (threadId: string, nextTitle: string, nextTags: string[]) => {
    if (!currentUser) return alert("投稿するにはログインが必要です。");
    const th = threads.find((t) => t.id === threadId);
    if (!th) return;
    if (th.createdByUserId !== currentUser.id) return alert("スレッド作成者のみ編集できます。");

    const title = nextTitle.trim();
    if (!title) return alert("タイトルが空です。");
    const tags = normalizeTags(nextTags);

    const now = new Date().toISOString();
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, title: title.slice(0, 20), tags, updatedAt: now } : t)));
    setIsEditingThread(false);
  };

  const deleteThread = (threadId: string) => {
    if (!currentUser) { onRequireLogin(); return; }
    const th = threads.find((t) => t.id === threadId);
    if (!th) return;
    if (th.createdByUserId !== currentUser.id) return alert("スレッド作成者のみ削除できます。");
    if (!confirm(`スレッド「${th.title}」を削除しますか？\n投稿もすべて削除されます。`)) return;
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    setPosts((prev) => prev.filter((p) => p.threadId !== threadId));
    setSelectedThreadId(null);
  };

  // 返信機能なし：parentIdを作らない
  const addPost = (threadId: string, body: string, visibility: BoardVisibility) => {
    if (!currentUser) return requireLogin();

    const textBody = body.trim();
    if (!textBody) return;
    if (textBody.length > 800) return alert("本文は800文字以内にしてください。");

    const now = new Date().toISOString();
    const p: BoardPost = {
      id: makeId(),
      threadId,
      body: textBody,
      createdAt: now,
      authorUserId: currentUser.id,
      visibility,
    };
    setPosts((prev) => [...prev, p]);
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, updatedAt: now } : t)));
  };

  const updatePost = (postId: string, nextBody: string) => {
    if (!currentUser) return requireLogin();
    const textBody = nextBody.trim();
    if (!textBody) return alert("本文が空です。");
    if (textBody.length > 800) return alert("本文は800文字以内にしてください。");

    const target = posts.find((p) => p.id === postId);
    if (!target) return;
    if (target.authorUserId !== currentUser.id) return alert("自分の投稿のみ編集できます。");

    const now = new Date().toISOString();
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, body: textBody, updatedAt: now } : p)));
    setThreads((prev) => prev.map((t) => (t.id === target.threadId ? { ...t, updatedAt: now } : t)));
  };

  const deletePost = (postId: string) => {
    if (!currentUser) return requireLogin();
    const target = posts.find((p) => p.id === postId);
    if (!target) return;
    if (target.authorUserId !== currentUser.id) return alert("自分の投稿のみ削除できます。");

    if (!confirm("この投稿を削除しますか？")) return;

    // 互換：過去に返信があった場合に備えて子孫も削除
    const byParent = new Map<string, string[]>();
    posts.forEach((p) => {
      if (p.parentId) {
        const arr = byParent.get(p.parentId) ?? [];
        arr.push(p.id);
        byParent.set(p.parentId, arr);
      }
    });

    const toDelete = new Set<string>();
    const stack = [postId];
    while (stack.length) {
      const cur = stack.pop() as string;
      if (toDelete.has(cur)) continue;
      toDelete.add(cur);
      const kids = byParent.get(cur) ?? [];
      kids.forEach((k) => stack.push(k));
    }

    const now = new Date().toISOString();
    setPosts((prev) => prev.filter((p) => !toDelete.has(p.id)));
    setThreads((prev) => prev.map((t) => (t.id === target.threadId ? { ...t, updatedAt: now } : t)));

    if (editingId && toDelete.has(editingId)) {
      setEditingId(null);
      setEditingBody("");
    }
  };

  const resolveAuthorProfile = (userId: string) => {
    return loadFromLocalStorage<BoardProfile>(
      KEY_BOARD_PROFILE,
      { displayName: "ユーザー", defaultVisibility: "nickname", icon: "👤" },
      userId
    );
  };

  const resolveAuthorLabel = (p: BoardPost) => {
    if (p.visibility === "anonymous") return "匿名";
    const prof = resolveAuthorProfile(p.authorUserId);
    return (prof?.displayName || "ユーザー").slice(0, 10);
  };

  const resolveAuthorIcon = (p: BoardPost) => {
    if (p.visibility === "anonymous") return "👤";
    const prof = resolveAuthorProfile(p.authorUserId);
    return prof?.icon || "👤";
  };
  const resolveThreadOwnerName = (t: BoardThread) => {
    const prof = resolveAuthorProfile(t.createdByUserId);
    return (prof?.displayName ?? "ユーザー").slice(0, 10);
  };
  const resolveThreadOwnerIcon = (t: BoardThread) => {
    const prof = resolveAuthorProfile(t.createdByUserId);
    return prof?.icon ?? "👤";
  };


  const tagLabel = (tagId: string) => TAG_OPTIONS.find((t) => t.id === tagId)?.label ?? tagId;

  const tagChipClass = (tagId: string) => {
    switch (tagId) {
      case "question":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "consult":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "report":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "success":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "fail":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "chat":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "recommend":
        return "bg-yellow-50 text-yellow-800 border-yellow-200";
      case "tool":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "setting":
        return "bg-stone-50 text-stone-700 border-stone-200";
      case "other":
        return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
      default:
        return "bg-zinc-50 text-zinc-700 border-zinc-200";
    }
  };

  // ✅ タグ選択の見やすさ改善（選択中：✓＋リング＋影）
  const tagToggleBtnClass = (tagId: string, active: boolean) => {
    return [
      "relative text-xs px-3 py-2 rounded-lg border font-extrabold transition",
      "active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-200",
      tagChipClass(tagId),
      active ? "opacity-100 ring-2 ring-indigo-400 shadow-md" : "opacity-70 hover:opacity-100 hover:shadow-sm",
    ].join(" ");
  };


  const RECENT_DAYS = 2;
  const isRecent = (iso?: string) => {
    if (!iso) return false;
    try {
      const t = new Date(iso).getTime();
      if (!Number.isFinite(t)) return false;
      return Date.now() - t <= RECENT_DAYS * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  };

  const TAG_PRIORITY: string[] = [
    "question",
    "consult",
    "report",
    "success",
    "fail",
    "chat",
    "recommend",
    "tool",
    "setting",
    "other",
  ];
  const getThreadPriority = (t: BoardThread) => {
    const tags = t.tags ?? [];
    if (!tags.length) return TAG_PRIORITY.length + 1; // タグなしは最後
    let best = TAG_PRIORITY.length + 1;
    for (const tagId of tags) {
      const idx = TAG_PRIORITY.indexOf(tagId);
      if (idx >= 0 && idx < best) best = idx;
    }
    return best;
  };

  const sortedThreads = React.useMemo(() => {
    // スレッド一覧は『作成日が新しい順』に表示
    return [...threads].sort((a, b) => {
      const da = (a.createdAt ?? a.updatedAt ?? "");
      const db = (b.createdAt ?? b.updatedAt ?? "");
      if (db !== da) return db.localeCompare(da);
      // 同一時刻の場合は更新日の新しい順で安定化
      return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    });
  }, [threads]);

  const filteredThreads = React.useMemo(() => {
    let base = sortedThreads;

    // 参加スレッドのみ（投稿した or 作成した）
    if (showMineThreadsOnly && currentUser) {
      const mineThreadIds = new Set<string>();
      posts.forEach((p) => {
        if (p.authorUserId === currentUser.id) mineThreadIds.add(p.threadId);
      });
      base = base.filter((t) => mineThreadIds.has(t.id) || t.createdByUserId === currentUser.id);
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((t) => {
      const titleHit = (t.title ?? "").toLowerCase().includes(q);
      const tags = t.tags ?? [];
      const tagHit = tags.some((tagId) => tagLabel(tagId).toLowerCase().includes(q));
      return titleHit || tagHit;
    });
  }, [sortedThreads, searchQuery, showMineThreadsOnly, currentUser, posts]);

  const totalPages = Math.max(1, Math.ceil(filteredThreads.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pagedThreads = filteredThreads.slice(pageStart, pageEnd);
  const threadNoMap = React.useMemo(() => {
    const m = new Map<string, number>();
    // スレッド番号は『作成日が古い順』で 1,2,3...（表示順とは独立）
    const ordered = [...threads].sort((a, b) => {
      const da = (a.createdAt ?? a.updatedAt ?? "");
      const db = (b.createdAt ?? b.updatedAt ?? "");
      if (da !== db) return da.localeCompare(db);
      return (a.updatedAt ?? "").localeCompare(b.updatedAt ?? "");
    });
    ordered.forEach((t, idx) => m.set(t.id, idx + 1));
    return m;
  }, [threads]);

  const threadAllPosts = React.useMemo(() => {
    if (!selectedThread) return [] as BoardPost[];
    return posts
      .filter((p) => p.threadId === selectedThread.id)
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  }, [posts, selectedThread]);

  // No.付与（時系列の通し番号）
  const postNoMap = React.useMemo(() => {
    const m = new Map<string, number>();
    threadAllPosts.forEach((p, idx) => m.set(p.id, idx + 1));
    return m;
  }, [threadAllPosts]);

  const filteredPosts = React.useMemo(() => {
    const base = showMineOnly && currentUser ? threadAllPosts.filter((p) => p.authorUserId === currentUser.id) : threadAllPosts;
    // 互換：古い返信データが残っていてもフラット表示する
    return base;
  }, [threadAllPosts, currentUser, showMineOnly]);

  
  
    return (
    <div className="space-y-6">
      {!currentUser && (
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
          <p className="text-sm text-gray-700">👀 閲覧はできます。投稿するにはログインしてください。</p>
          <button onClick={onRequireLogin} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-200">
            ログインする
          </button>
        </div>
      )}

      {!selectedThread ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="text-center">
              <h3 className="font-extrabold text-gray-800 text-lg">スレッド一覧</h3>
              <p className="mt-1 text-xs text-gray-500">タイトルで絞り込みできます。スレッドを選ぶと詳細が開きます。</p>
            </div>
            <div className="w-full space-y-4">
              {/* A) 検索＋表示件数＋参加スレッドのみ＋注釈（1つの枠） */}
              <div className="w-full bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-extrabold text-gray-700">検索（タイトル・タグ）</p>
                <div className="mt-3 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="例：質問 / ツール / おすすめ…"
                    className={`pl-11 pr-3 py-3 border border-gray-300 rounded-2xl text-sm w-full ${focusCls}`}
                    aria-label="スレッド検索"
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm font-extrabold text-gray-700">表示：<span className="text-gray-900">{filteredThreads.length}</span> 件</p>
                  {currentUser && (
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 border border-indigo-200 text-sm font-extrabold text-indigo-800 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={showMineThreadsOnly}
                        onChange={(e) => {
                      setShowMineThreadsOnly(e.target.checked);
}}
                      />
                      参加スレッドのみ
                    </label>
                  )}
                </div>

                <p className="mt-2 text-xs text-gray-400 font-bold">
                  ※「参加スレッドのみ」は、自分が作成または投稿したスレッドだけ表示します。
                </p>
              </div>

              {/* B) ＋ 新規スレッドを作成する（別枠） */}
              <div className="w-full flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const next = !isCreateOpen;
                    setIsCreateOpen(next);
                  }}
                  className="w-full sm:w-[34rem] px-6 py-4 rounded-2xl font-extrabold tracking-wide text-base bg-gradient-to-r from-amber-400 to-yellow-400 text-white drop-shadow-sm border border-amber-400 shadow-lg hover:shadow-xl hover:from-amber-500 hover:to-yellow-500 transition-all duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-amber-300 active:scale-[0.99]"
                >
                  ＋ 新規スレッドを作成する
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4" ref={createBoxRef}>
  {isCreateOpen && (
            <ThreadCreateBox
              currentUser={currentUser}
              profile={profile}
              setProfile={setProfile}
              focusCls={focusCls}
              TAG_OPTIONS={TAG_OPTIONS}
              tagToggleBtnClass={tagToggleBtnClass}
              toggleTag={toggleTag}
              onRequireLogin={onRequireLogin}
              createThread={createThread}
              setIsCreateOpen={setIsCreateOpen}
            />
          )}
</div>

          <div className="mt-4 space-y-2" ref={threadListRef}>
            {pagedThreads.length === 0 ? (
              <p className="text-sm text-gray-400">該当するスレッドがありません。</p>
            ) : (
              pagedThreads.map((t) => {
                const threadPosts = posts
                  .filter((p) => p.threadId === t.id)
                  .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
                const postCount = threadPosts.length;
                const lastPost = postCount ? threadPosts[postCount - 1] : null;
                const lastPoster = lastPost ? resolveAuthorLabel(lastPost) : resolveThreadOwnerName(t);
                const no = threadNoMap.get(t.id) ?? 0;

                
                const isOwner = !!currentUser && t.createdByUserId === currentUser.id;
return (
                  <button
                    id={`dwthread-${t.id}`}
                    key={t.id}
                    onClick={() => {
                      // 一覧のスクロール位置を保存してから詳細へ遷移
                      try {
                        const el = threadListRef.current;
                        let scroller: HTMLElement | Window = window;
                        if (el && typeof window !== "undefined") {
                          let p: HTMLElement | null = el.parentElement;
                          while (p) {
                            const st = window.getComputedStyle(p);
                            const oy = st.overflowY;
                            if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) {
                              scroller = p;
                              break;
                            }
                            p = p.parentElement;
                          }
                        }
                        if (scroller === window) {
                          listScrollPosRef.current = { isWindow: true, top: window.scrollY };
                        } else {
                          listScrollPosRef.current = { isWindow: false, top: (scroller as HTMLElement).scrollTop };
                        }
                        lastViewedThreadIdRef.current = t.id;
                      } catch { /* noop */ }
                      setSelectedThreadId(t.id);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-200 ${isOwner ? "bg-white border-indigo-200 hover:bg-indigo-50" : "bg-white border-gray-200 hover:bg-indigo-50"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xl shrink-0">
                        {resolveThreadOwnerIcon(t)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
  <span className="shrink-0 text-xs text-gray-500 font-bold">[{no}]</span>
<p className="font-extrabold text-gray-900 text-base md:text-lg leading-snug line-clamp-1 min-w-0">{t.title}{t.updatedAt && t.createdAt && t.updatedAt !== t.createdAt ? <span className="ml-1 text-xs text-gray-400">（編集済み）</span> : null}</p>
                        {isOwner ? (
                          <>
                            <span className="shrink-0 text-xs px-2 py-0.5 rounded bg-indigo-600 text-white font-extrabold">自分</span>
                            <span className="shrink-0 text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-extrabold border border-indigo-200">スレ主</span>
                          </>
                        ) : null}
                        {isRecent(t.createdAt) ? <span className="shrink-0 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">🌱 新規</span> : null}
                        {isRecent(t.updatedAt) ? <span className="shrink-0 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-800 border border-rose-200">🔥 更新</span> : null}
                      </div>
                        <div className="mt-1 text-xs md:text-sm text-gray-600 font-bold flex flex-wrap items-center gap-2">
                      
                      
                      
                      <span className="inline-flex items-center gap-1">🕒 {fmtJst(t.updatedAt)}</span>
                      <span className="text-gray-300">|</span>
                      <span className="inline-flex items-center gap-1">💬 {postCount}</span>
                      <span className="text-gray-300">|</span>
                      <span className="inline-flex items-center gap-1">👤 最終投稿者：{lastPoster}さん</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {(() => {
                            const all = t.tags ?? [];
                            return (
                              <>
                                {all.map((x) => (
                                  <span
                                    key={x}
                                    className={`text-xs px-2 py-1 rounded-full border font-extrabold ${tagChipClass(x)}`}
                                  >
                                    {tagLabel(x)}
                                  </span>
                                ))}
                              </>
                            );
                          })()}
                    </div>
                      </div>
                    </div>
                  </button>
                );
              }))}
          </div>

          <div className="mt-6 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-gray-500 font-bold">
              {filteredThreads.length === 0 ? 0 : pageStart + 1}～{Math.min(pageEnd, filteredThreads.length)} 件目 / 全{filteredThreads.length}件
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className={`text-xs px-3 py-2 rounded-lg border font-bold transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-200 ${safePage <= 1 ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
              >
                前へ
              </button>
              <span className="text-xs text-gray-600 font-bold">{safePage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className={`text-xs px-3 py-2 rounded-lg border font-bold transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-200 ${safePage >= totalPages ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
              >
                次へ
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={() => setSelectedThreadId(null)}
              className="text-xs px-3 py-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-teal-200"
            >
              ← スレッド一覧
            </button>

            <div className="flex items-center gap-2">
              {currentUser && (
                <label className="text-xs font-bold text-indigo-800 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-lg">
                  <input type="checkbox" checked={showMineOnly} onChange={(e) => setShowMineOnly(e.target.checked)} />
                  自分の投稿のみ
                </label>
              )}
<div className="text-right">
                <p className="text-xs text-gray-500 font-bold">更新日: {fmtJst(selectedThread.updatedAt)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {!isEditingThread ? (
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-extrabold text-gray-800">{selectedThread.title}{selectedThread.updatedAt && selectedThread.createdAt && selectedThread.updatedAt !== selectedThread.createdAt ? <span className="ml-1 text-xs text-gray-400">（編集済み）</span> : null}</h3>
                {isThreadOwner && (
  <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingThread(true);
                      setThreadTitleDraft(selectedThread.title);
                      setThreadTagsDraft(selectedThread.tags ?? []);
                    }}
                    className="text-xs px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-bold hover:bg-amber-100 transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-amber-200"
                  >
                    スレッド編集
                  </button>
    <button
      type="button"
      onClick={() => deleteThread(selectedThread.id)}
      className="text-xs px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-red-200"
    >
      スレッド削除
    </button>
  </div>
)}</div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-600 font-bold mb-2">スレッド内容を編集（スレ主のみ）</p>
                <input
                  value={threadTitleDraft}
                  onChange={(e) => setThreadTitleDraft(e.target.value)}
                  className={`w-full p-3 border border-gray-300 rounded-lg ${focusCls}`}
                  maxLength={20}
                  aria-label="スレッドタイトル編集"
                />

                <div className="mt-3">
                  <p className="text-xs text-gray-600 font-bold mb-2">タグ（複数選択可・上限なし）</p>
                  <div className="flex flex-wrap gap-2">
                    {TAG_OPTIONS.map((t) => {
                      const active = threadTagsDraft.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setThreadTagsDraft((prev) => toggleTag(prev, t.id))}
                          className={tagToggleBtnClass(t.id, active)}
                          aria-pressed={active}
                        >
                          {active && (
                            <span className="mr-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/70 border border-white">
                              ✓
                            </span>
                          )}
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingThread(false);
                      setThreadTitleDraft(selectedThread.title);
                      setThreadTagsDraft(selectedThread.tags ?? []);
                    }}
                    className="text-xs px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={() => updateThread(selectedThread.id, threadTitleDraft, threadTagsDraft)}
                    className="text-xs px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    保存
                  </button>
                </div>
              </div>
            )}

            {!isEditingThread && (
              <div className="mt-2 flex gap-2 flex-wrap items-center">
                {(selectedThread.tags ?? []).map((x) => (
                  <span key={x} className={`text-xs px-2 py-1 rounded border font-bold ${tagChipClass(x)}`}>{tagLabel(x)}</span>
                ))}
                <span className="text-xs text-gray-400 ml-auto">投稿: {threadAllPosts.length}</span>
              </div>
            )}
            <hr className="my-4 border-gray-200" />
          </div>

          <div className="space-y-3">
            {filteredPosts.length === 0 ? (
              <p className="text-sm text-gray-400">まだ投稿がありません。最初の投稿をしてみましょう。</p>
            ) : (
              filteredPosts.map((p) => <RenderPostRow
            key={p.id}
            post={p}
            currentUser={currentUser}
            selectedThread={selectedThread}
            no={postNoMap.get(p.id) ?? 0}
            highlightPostId={highlightPostId}
            resolveAuthorIcon={resolveAuthorIcon}
            resolveAuthorLabel={resolveAuthorLabel}
            fmtJst={fmtJst}
            editingId={editingId}
            editingBody={editingBody}
            setEditingId={setEditingId}
            setEditingBody={setEditingBody}
            updatePost={updatePost}
            deletePost={deletePost}
            focusCls={focusCls}
          />)
            )}
          </div>

          <PostComposer
            currentUser={currentUser}
            onRequireLogin={onRequireLogin}
            profile={profile}
            setProfile={setProfile}
            selectedThread={selectedThread}
            addPost={addPost}
            showIconPicker={showIconPicker}
            setShowIconPicker={setShowIconPicker}
            composerRef={composerRef}
            focusCls={focusCls}
          />
        </div>
      )}
    </div>
  );
};

/* ===============================================
 6. 趣味UI（カード＋詳細モーダル＋セクション）
=============================================== */
type HobbyWithType = Hobby & { typeId: AddictionTypeId; typeName: string; typeIcon: string };
type HobbyFlat = Hobby & { typeId: AddictionTypeId };

const HOBBY_COST_LABELS: Record<HobbyCost, string> = {
  free: "無料（0円）",
  low: "低コスト（〜1,000円）",
  mid: "中コスト（〜5,000円）",
  high: "高コスト（5,000円〜）",
};
const HOBBY_COST_COLOR: Record<HobbyCost, string> = {
  free: "bg-green-50 text-green-800 border-green-200",
  low: "bg-teal-50 text-teal-800 border-teal-200",
  mid: "bg-yellow-50 text-yellow-800 border-yellow-200",
  high: "bg-red-50 text-red-800 border-red-200",
};
// 難易度ごとの色（Tailwind）
const HOBBY_DIFFICULTY_COLOR: Record<"初級" | "中級" | "上級", string> = {
  初級: "bg-sky-50 text-sky-800 border-sky-200",
  中級: "bg-indigo-50 text-indigo-800 border-indigo-200",
  上級: "bg-purple-50 text-purple-800 border-purple-200",
};
const getDifficultyBadgeClass = (label: "初級" | "中級" | "上級") =>
  `px-2 py-1 rounded border ${HOBBY_DIFFICULTY_COLOR[label]}`;


// 趣味アイコン（未指定の場合のフォールバック）
const HOBBY_ICON_MAP: Record<string, string> = {
  journaling: "📝",
  letter: "✉️",
  evening_walk: "🚶",
  boardgame: "🃏",
  cooking: "🍳",
  diy: "🛠️",
  stretch: "🧘",
  plant: "🪴",
  tidy: "🧹",
  reading: "📚",
  bath: "🛁",
  night_walk: "🌙",
  // 追加したhigh系（念のため）
  pottery_class: "🏺",
  camera_walk: "📷",
  climbing_gym: "🧗",
  drum_lesson: "🥁",
  personal_gym: "🏋️",
  road_bike: "🚴",
  tea_ceremony: "🍵",
  massage_course: "💆",
};

const getHobbyIcon = (hobby: Hobby) => {
  if (hobby.icon) return hobby.icon;
  const byId = HOBBY_ICON_MAP[hobby.id];
  if (byId) return byId;
  return hobby.place === "outdoor" ? "✨" : "✨";
};

// 難易度（明示があればそれを優先。無ければ既存スコア方式で推定）
type HobbyDifficultyLabel = "初級" | "中級" | "上級";
type HobbyDifficultyId = "easy" | "normal" | "hard";
const difficultyLabelToId = (label: HobbyDifficultyLabel): HobbyDifficultyId => (
  label === "初級" ? "easy" : label === "中級" ? "normal" : "hard"
);
const getHobbyDifficultyLabel = (hobby: Hobby): HobbyDifficultyLabel => {
  if (hobby.difficulty) return hobby.difficulty;
  // 既存の簡易スコア（時間・準備物・屋外・コスト）
  const timeScore = hobby.minutes;
  const suppliesScore = (hobby.supplies?.length ?? 0) * 5;
  const placeScore = hobby.place === "outdoor" ? 8 : 0;
  const costScore = hobby.cost === "high" ? 10 : hobby.cost === "mid" ? 5 : hobby.cost === "low" ? 2 : 0;
  const total = timeScore + suppliesScore + placeScore + costScore;
  return total <= 12 ? "初級" : total <= 25 ? "中級" : "上級";
};
const getHobbyDifficultyId = (hobby: Hobby): HobbyDifficultyId => difficultyLabelToId(getHobbyDifficultyLabel(hobby));


// 屋内・屋外の表示（アイコン付き）
const getPlaceMeta = (place: HobbyPlace) => {
  return place === "outdoor"
    ? { label: "屋外", icon: "☀️" }
    : { label: "屋内", icon: "🏠" };
};

const HobbyDetailModal: React.FC<{
  hobby: Hobby | null;
  open: boolean;
  onClose: () => void;
}> = ({ hobby, open, onClose }) => {
  useBodyScrollLock(open);
  if (!open || !hobby) return null;
  const diff = getHobbyDifficultyLabel(hobby);
  return (
    <div className="fixed inset-0 z-50 bg-gray-900/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200" onClick={onClose} aria-label="閉じる">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <h3 className="text-xl font-extrabold text-gray-800">{getHobbyIcon(hobby)} <span className="ml-2">{hobby.name}</span></h3>
        <p className="mt-1 text-sm text-gray-600">{hobby.description}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className={getDifficultyBadgeClass(diff)}>難易度：{diff}</span>
          <span className={`px-2 py-1 rounded border ${HOBBY_COST_COLOR[hobby.cost]}`}>初期費用：{HOBBY_COST_LABELS[hobby.cost]}</span>
          <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">{getPlaceMeta(hobby.place).icon} {getPlaceMeta(hobby.place).label}</span>
          
        </div>

        <div className="mt-4 p-3 rounded border border-teal-200 bg-teal-50">
          <p className="text-sm font-bold text-teal-800">最初の一歩</p>
          <p className="text-sm text-teal-900">{hobby.firstStep}</p>
        </div>

        {hobby.supplies?.length ? (
          <div className="mt-3 p-3 rounded border border-indigo-200 bg-indigo-50">
            <p className="text-sm font-bold text-indigo-800">準備物</p>
            <p className="text-sm text-indigo-900">{hobby.supplies.join("、")}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const HobbyCard: React.FC<{
  hobby: Hobby;
  typeIcon: string;
  typeName: string;
  onOpenDetail: (h: Hobby) => void;
}> = ({ hobby, typeIcon, typeName, onOpenDetail }) => {
  const diff = getHobbyDifficultyLabel(hobby);
  return (
    <div className="text-sm bg-white border border-purple-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 text-sm">{getHobbyIcon(hobby)}</span>
          <p className="font-bold text-gray-800">{hobby.name}</p>
        </div>
</div>

      <p className="mt-2 text-gray-600">{hobby.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={getDifficultyBadgeClass(diff)}>難易度：{diff}</span>
        <span className={`px-2 py-1 rounded border ${HOBBY_COST_COLOR[hobby.cost]}`}>初期費用：{HOBBY_COST_LABELS[hobby.cost]}</span>
        <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">{getPlaceMeta(hobby.place).icon} {getPlaceMeta(hobby.place).label}</span>
        <span className="px-2 py-1 rounded bg-white border border-gray-200 text-gray-700">タイプ：{typeIcon} {typeName}</span>
      </div>

      <div className="mt-4">
        <button onClick={() => onOpenDetail(hobby)} className="text-xs bg-white border border-indigo-300 text-indigo-700 px-3 py-2 rounded font-bold transition hover:bg-indigo-50">詳細を見る</button>
      </div>
    </div>
  );
};

/* === 趣味セクション（セレクト削除／カードクリックで自動スクロール） === */
type SimpleFilters = { difficulty: "all" | "easy" | "normal" | "hard"; cost: "all" | HobbyCost };

const HobbySection: React.FC<{ currentUser: User | null; onGoPersonalize: () => void }> = ({ currentUser, onGoPersonalize }) => {
  const savedTypeResult = currentUser
    ? loadFromLocalStorage<AddictionType | null>(KEY_TYPE_RESULT, null, currentUser.id)
    : loadFromLocalStorage<AddictionType | null>(KEY_TYPE_RESULT, null);

  // 初期タイプ：診断済みならそのタイプ／未診断なら sns
  const [currentTypeId, setCurrentTypeId] = React.useState<AddictionTypeId>(
    (savedTypeResult?.id as AddictionTypeId) ?? "sns"
  );

  // おすすめセクションへの参照（自動スクロール用）
  const recoSectionRef = React.useRef<HTMLDivElement>(null);

  const KEY_SIMPLE_FILTERS = "dw_hobby_simple_filters";
  const [filters, setFilters] = React.useState<SimpleFilters>(
    loadFromLocalStorage<SimpleFilters>(KEY_SIMPLE_FILTERS, { difficulty: "all", cost: "all" })
  );
  React.useEffect(() => { saveToLocalStorage(KEY_SIMPLE_FILTERS, filters); }, [filters]);

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailTarget, setDetailTarget] = React.useState<Hobby | null>(null);
  const openDetail = (h: Hobby) => { setDetailTarget(h); setDetailOpen(true); };
  const closeDetail = () => setDetailOpen(false);

  const currentType: AddictionType | null = ADDICTION_TYPES[currentTypeId] ?? null;

  const allHobbiesFlat: HobbyFlat[] = React.useMemo(() => {
    return (Object.values(ADDICTION_TYPES) as AddictionType[]).flatMap((t) =>
      (t.recommendedHobbies ?? []).map((h) => ({ ...h, typeId: t.id }))
    );
  }, []);

  const recommendedForCurrentType: Hobby[] = currentType?.recommendedHobbies ?? [];

  const filtered: HobbyFlat[] = React.useMemo(() => {
    return allHobbiesFlat.filter((h) => {
      const diff = getHobbyDifficultyId(h);
      const passDiff = filters.difficulty === "all" || filters.difficulty === diff;
      const passCost =
        filters.cost === "all" ||
        filters.cost === h.cost ||
        (filters.cost === "low" && (h.cost === "free" || h.cost === "low"));
      return passDiff && passCost;
    });
  }, [allHobbiesFlat, filters]);

  const groups: Record<HobbyCost, HobbyFlat[]> = { free: [], low: [], mid: [], high: [] };
  filtered.forEach((h) => groups[h.cost].push(h));

  const TypePickCard: React.FC<{ t: AddictionType }> = ({ t }) => {
    const isRecommended = !!savedTypeResult && savedTypeResult.id === t.id;
    const handlePick = () => {
      setCurrentTypeId(t.id);
      // レイアウト更新後にスムーズスクロール
      setTimeout(() => {
        recoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    };
    return (
      <div className={`p-4 bg-white border rounded-xl shadow-sm flex items-start gap-3 ${isRecommended ? "border-amber-300 ring-2 ring-amber-200" : "border-purple-100"}`}>
        <div className="text-3xl">{t.icon}</div>
        <div className="flex-1">
          <p className="font-bold text-gray-800 flex items-center gap-2">{t.name}{isRecommended && (<span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-extrabold">おすすめ</span>)}</p>
          <p className="text-xs text-gray-600 mt-1">{t.description}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handlePick}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded font-bold border border-indigo-200 transition"
            >{isRecommended ? "このタイプでおすすめを見る" : "このタイプでおすすめを見る"}</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="bg-white border border-purple-100 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl md:text-2xl font-bold text-purple-800 flex items-center gap-2"><span>📗</span> 趣味（アナログ置き換え）おすすめカタログ</h2>
        <p className="mt-2 text-sm text-gray-600">デジタルデトックスやリラックスに向いた趣味をタイプ別に紹介します。難易度・コストで絞り込みもできます。</p>
      </div>

      {/* あなたへのおすすめ（タイプ別） */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 shadow-sm">
        <p className="text-sm font-bold text-purple-700 flex items-center gap-2"><span>🍃</span> あなたへのおすすめ</p>
        <p className="mt-1 text-xs text-gray-600">タイプを選択すると、あなた向けのおすすめが表示されます。</p>

      {!savedTypeResult && (
        <div className="mt-4 p-4 rounded-lg bg-white border border-purple-200 text-sm text-gray-700">
          <p className="font-extrabold text-purple-700 mb-1">まだタイプ診断が完了していません</p>
          <p className="text-xs text-gray-600 mb-3">3問であなたの傾向を判定し、あなたへのおすすめを自動表示します。</p>
          <button onClick={onGoPersonalize} className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-lg transition">タイプ診断へ移動する</button>
        </div>
      )}

        {/* タイプ選択（セレクトは削除／カードのみ常時表示） */}
        <div className="mt-6 space-y-3">
          <p className="text-xs font-bold text-gray-700">タイプを選択</p>
      {savedTypeResult && (
        <div className="mt-2 p-3 rounded-lg bg-white/70 border border-purple-200 text-xs text-gray-700">
          <span className="font-extrabold text-purple-700">あなたの診断結果：</span>
          <span className="ml-1">{savedTypeResult.icon} {savedTypeResult.name}</span>
          <span className="ml-2 text-gray-500">（おすすめバッジのカードが該当）</span>
        </div>
      )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Object.values(ADDICTION_TYPES) as AddictionType[]).map((t) => (
              <TypePickCard key={t.id} t={t} />
            ))}
          </div>
        </div>

        {/* おすすめカード（選択タイプを下に表示） */}
        <div className="mt-6 scroll-mt-24" ref={recoSectionRef}>
          <p className="text-xs font-bold text-gray-700 mb-2">選択したタイプのおすすめ趣味</p>
          {currentType && recommendedForCurrentType.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recommendedForCurrentType.map((h) => (
                <HobbyCard
                  key={`${currentTypeId}-${h.id}`}
                  hobby={h}
                  typeIcon={currentType.icon}
                  typeName={currentType.name}
                  onOpenDetail={openDetail}
                />
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400">（このタイプのおすすめを準備中です）</div>
          )}
        </div>
      </div>

      {/* フィルタ */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <p className="text-sm font-bold text-gray-700 flex items-center gap-2"><span>🔎</span> 趣味を絞り込む</p>

        {/* 難易度 */}
        <div className="mt-4">
          <p className="text-xs font-bold text-gray-700 mb-2">難易度</p>
          <div className="flex flex-wrap gap-2">
            {(["all","easy","normal","hard"] as const).map((id) => (
              <button
                key={id}
                onClick={() => setFilters((prev) => ({ ...prev, difficulty: id }))}
                className={`text-xs px-3 py-1.5 rounded-full border font-bold transition ${
                  filters.difficulty === id
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                }`}
              >
                {id==="all" ? "全て" : id==="easy" ? "初級" : id==="normal" ? "中級" : "上級"}
              </button>
            ))}
          </div>
        </div>

        {/* コスト */}
        <div className="mt-4">
          <p className="text-xs font-bold text-gray-700 mb-2">初期費用・コスト</p>
          <div className="flex flex-wrap gap-2">
            {(["all","free","low","mid","high"] as const).map((id) => (
              <button
                key={id}
                onClick={() => setFilters((prev) => ({ ...prev, cost: id }))}
                className={`text-xs px-3 py-1.5 rounded-full border font-bold transition ${
                  filters.cost === id
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                }`}
              >
                {id==="all" ? "全て" : id==="free" ? "無料" : id==="low" ? "低コスト" : id==="mid" ? "中コスト" : "高コスト"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 一覧（常時表示） */}
      <div className="space-y-6">
        {(["free","low","mid","high"] as HobbyCost[]).map((cost) => (
          <div key={cost}>
            <div className={`inline-flex items-center px-2 py-1 mb-3 rounded border text-xs font-bold ${HOBBY_COST_COLOR[cost]}`}>
              {HOBBY_COST_LABELS[cost]} <span className="ml-1 text-gray-400">（{groups[cost].length}件）</span>
            </div>
            {groups[cost].length === 0 ? (
              <div className="text-xs text-gray-400">（該当なし）</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {groups[cost].map((h) => {
                  const t = ADDICTION_TYPES[h.typeId];
                  return (
                    <HobbyCard
                      key={`${h.typeId}-${h.id}`}
                      hobby={h}
                      typeIcon={t.icon}
                      typeName={t.name}
                      onOpenDetail={openDetail}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 詳細モーダル */}
      <HobbyDetailModal hobby={detailTarget} open={detailOpen} onClose={closeDetail} />
    </div>
  );
};

/* ===============================================
 7. パーソナライズ診断
=============================================== */
const PersonalizeSection = ({
  currentUser,
  appStats,
  chartjsConstructor,
  isChartJsLoaded,
  onOpenSurvey,
}: {
  currentUser: User | null;
  appStats: AppStat[];
  chartjsConstructor: ChartConstructor;
  isChartJsLoaded: boolean;
  onOpenSurvey: (app: AppStat) => void;
}) => {
  const savedResult = currentUser ? loadFromLocalStorage<AddictionType | null>(KEY_TYPE_RESULT, null, currentUser.id) : loadFromLocalStorage<AddictionType | null>(KEY_TYPE_RESULT, null);
  const initialStep: "intro" | "question" | "result" = savedResult ? "result" : "intro";
  const [step, setStep] = useState<"intro" | "question" | "result">(initialStep);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [scores, setScores] = useState<Record<AddictionTypeId, number>>({ sns: 0, game: 0, habit: 0, work: 0 });
  const [resultType, setResultType] = useState<AddictionType | null>(savedResult || null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Hobby | null>(null);
  const openDetail = (h: Hobby) => { setDetailTarget(h); setDetailOpen(true); };
  const closeDetail = () => setDetailOpen(false);

  const handleStart = () => { setStep("question"); setCurrentQuestionIdx(0); setScores({ sns: 0, game: 0, habit: 0, work: 0 }); };
  const handleAnswer = (type: AddictionTypeId) => {
    const newScores = { ...scores, [type]: scores[type] + 1 };
    setScores(newScores);
    if (currentQuestionIdx < PERSONALIZE_QUESTIONS.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      const maxType = (Object.keys(newScores) as AddictionTypeId[]).reduce((a, b) => newScores[a] >= newScores[b] ? a : b, "habit");
      const result = ADDICTION_TYPES[maxType];
      setResultType(result);
      if (currentUser) saveToLocalStorage(KEY_TYPE_RESULT, result, currentUser.id);
      else saveToLocalStorage(KEY_TYPE_RESULT, result);
      setStep("result");
    }
  };
  const handleRetake = () => { setResultType(null); if (currentUser) saveToLocalStorage(KEY_TYPE_RESULT, null, currentUser.id); else saveToLocalStorage(KEY_TYPE_RESULT, null); handleStart(); };

  const recommendedApps = resultType
    ? appStats.filter((app) => resultType.recommendedAppIds.includes(app.id)).slice(0, 3)
    : [];

  if (step === "intro") {
    return (
      <div className="max-w-2xl mx-auto text-center pt-10">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-teal-100">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">依存タイプ診断</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            依存の形は人それぞれです。<br/>
            SNS、ゲーム、無意識の癖…<br/>
            あなたの傾向を分析し、最適な対策アプリとアナログ趣味を提案します。
          </p>
          <button onClick={handleStart} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 px-10 rounded-full shadow-lg transition transform hover:scale-105">
            診断をはじめる（3問）
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
            {q.options.map((opt, idx) => (
              <button key={idx} onClick={() => handleAnswer(opt.type as AddictionTypeId)} className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-teal-50 hover:border-teal-300 transition font-semibold text-gray-700">
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // result
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
        {recommendedApps.map((app) => (
          <AppCard key={app.id} app={app} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} onOpenSurvey={onOpenSurvey} />
        ))}
      </div>

      <h3 className="mt-8 text-xl font-bold text-gray-700 mb-4 flex items-center"><span className="mr-2">🧶</span> あなたへのアナログ趣味の提案</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {resultType?.recommendedHobbies?.map((h) => (
          <HobbyCard key={h.id} hobby={h} typeIcon={resultType!.icon} typeName={resultType!.name} onOpenDetail={openDetail} />
        ))}
      </div>

      {/* 詳細モーダル */}
      <HobbyDetailModal hobby={detailTarget} open={detailOpen} onClose={closeDetail} />
    </div>
  );
};

/* --- 履歴詳細モーダル --- */
const HistoryDetailModal = ({ isOpen, onClose, record }: { isOpen: boolean; onClose: () => void; record: TestHistoryRecord | null; }) => {
  useBodyScrollLock(!!isOpen);
  if (!isOpen || !record) return null;
  const style = getResultStyle(record.level);
  return (
    <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center p-4 z-[100]">
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

          
        </div>
      </div>
    </div>
  );
};

/* --- 診断テストモーダル --- */

/* --- 診断テストモーダル（派手FX/ good・bad切替 / 外側黒背景もFX / 結果は上から） --- */
const AddictionTestModal = React.memo((({
  isOpen, setIsModalOpen, testQuestions, testAnswers, handleAnswerChange, calculateScore,
  resetTest, testResult, testTotalScore, handleOptionClick, isLoggedIn, onLoginForHistory,
  chartjsConstructor, isChartJsLoaded, testHistory,
}: {
  isOpen: boolean; setIsModalOpen: (v: boolean) => void;
  testQuestions: string[]; testAnswers: number[]; handleAnswerChange: (idx: number, score: number) => void;
  calculateScore: () => void; resetTest: () => void;
  testResult: { level: string; recommendation: string } | null; testTotalScore: number | null;
  handleOptionClick: (e: React.MouseEvent) => void;
  isLoggedIn: boolean; onLoginForHistory: () => void;
  chartjsConstructor: ChartConstructor; isChartJsLoaded: boolean; testHistory: TestHistoryRecord[];
}) => {
  // ✅ Hooksは必ず同じ順序で呼ぶ（Rules of Hooks）
  useBodyScrollLock(!!isOpen);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // ✅ モーダルを開いたとき／結果⇄質問の切替（再診断含む）で最上部へ
  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      const el = modalBodyRef.current;
      if (!el) return;
      try {
        el.scrollTo({ top: 0, behavior: "auto" });
      } catch {
        (el as any).scrollTop = 0;
      }
    });
  }, [isOpen, testResult?.level, testTotalScore]);

  // ★ベスト（●と同じサイズ感）：キャンバスに★を描画して pointStyle に使用
  const bestPointStyle = React.useMemo(() => {
    if (typeof document === "undefined") return "star" as any;
    const c = document.createElement("canvas");
    c.width = 24;
    c.height = 24;
    const ctx = c.getContext("2d");
    if (!ctx) return "star" as any;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.font = "18px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // 白縁
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.strokeText("★", 12, 12);
    // 本体
    ctx.fillStyle = "#f59e0b";
    ctx.fillText("★", 12, 12);
    return c;
  }, []);

  // ★最新（赤）：最新ポイントを赤い★で描画するためのキャンバス
  const latestStarPointStyle = React.useMemo(() => {
    if (typeof document === "undefined") return "star" as any;
    const c = document.createElement("canvas");
    c.width = 24;
    c.height = 24;
    const ctx = c.getContext("2d");
    if (!ctx) return "star" as any;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.font = "18px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.strokeText("★", 12, 12);
    ctx.fillStyle = "#ef4444";
    ctx.fillText("★", 12, 12);
    return c;
  }, []);


  if (!isOpen) return null;

  // ✅ testAnswers が壊れていても落ちない
  const safeAnswers: any[] = Array.isArray(testAnswers)
    ? (testAnswers as any[])
    : new Array(testQuestions.length).fill(null);

  const answeredCount = safeAnswers.filter((s: any) => s !== null && s !== undefined).length;
  const isAllAnswered = answeredCount === testQuestions.length;

  const options = [
    { label: "全くない (0点)", score: 0, class: "border-green-400 bg-green-50 text-green-700 hover:bg-green-100" },
    { label: "たまにある (1点)", score: 1, class: "border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100" },
    { label: "よくある (2点)", score: 2, class: "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100" },
    { label: "ほとんどいつも (3点)", score: 3, class: "border-red-400 bg-red-50 text-red-700 hover:bg-red-100" },
  ];

  const style = testResult ? getResultStyle(testResult.level) : null;

  // ===== 指標 =====
  const MAX_SCORE = testQuestions.length * 3;
  const getPrevRecordSafe = () => {
    if (!testHistory?.length) return null;
    const today = formatDate(new Date());
    const head = testHistory[0];
    if (head?.date === today && head?.score === (testTotalScore ?? head.score)) return testHistory[1] ?? null;
    return head ?? null;
  };
  const prevRecord = getPrevRecordSafe();
  const prevScore = prevRecord?.score ?? null;
  const delta = (prevScore === null || testTotalScore === null) ? null : (testTotalScore - prevScore);

  const isBadLevel = !!testResult && (testResult.level === "中度依存" || testResult.level === "重度依存");
  const fxMode: "good" | "bad" | "neutral" =
    !testResult ? "neutral" : (isBadLevel || (delta !== null && delta > 0)) ? "bad" : (delta !== null && delta < 0) ? "good" : "neutral";

// ✅ BEST SCORE を表示して良い判定（低依存/軽度依存のみ）
const canShowBestByLevel =
  testResult?.level === "低依存" || testResult?.level === "軽度依存";

const historyScores = (testHistory ?? [])
  .map(r => r.score)
  .filter(v => typeof v === "number" && !Number.isNaN(v)) as number[];

const scorePool = [testTotalScore, ...historyScores]
  .filter(v => typeof v === "number" && !Number.isNaN(v)) as number[];

const bestScoreSoFar = scorePool.length ? Math.min(...scorePool) : 0;

// ✅ ログイン中 かつ 「低依存/軽度依存」のときだけ BEST を許可（同点でも表示：<=）
const isBestUpdate =
  testTotalScore !== null &&
  isLoggedIn &&
  canShowBestByLevel &&
  testTotalScore <= bestScoreSoFar;

  const calcImproveStreak = () => {
    const scores = (testHistory ?? []).map(r => r.score).filter(v => typeof v === "number" && !Number.isNaN(v));
    const newestFirst = (testTotalScore !== null && scores[0] !== testTotalScore) ? [testTotalScore, ...scores] : scores;
    let s = 0;
    for (let i = 0; i < Math.min(10, newestFirst.length - 1); i++) {
      if (newestFirst[i] < newestFirst[i + 1]) s++;
      else break;
    }
    return s;
  };
  const improveStreak = calcImproveStreak();

  const getNextTarget = (score: number) => {
    if (score <= 6) return null;
    if (score <= 14) return { label: "低依存", threshold: 6 };
    if (score <= 23) return { label: "軽度依存", threshold: 14 };
    return { label: "中度依存", threshold: 23 };
  };
  const nextTarget = (testTotalScore !== null) ? getNextTarget(testTotalScore) : null;
  const pointsToNext = (testTotalScore !== null && nextTarget) ? (testTotalScore - nextTarget.threshold) : null;

  const estimateMinutesPerPoint = 5;
  const recoveredMinutesPerDay = (delta !== null && delta < 0) ? Math.abs(delta) * estimateMinutesPerPoint : 0;

  const headline =
    delta === null ? "診断結果" :
    delta < 0 ? `前回より ${delta}点。良い流れです！` :
    delta > 0 ? `前回より +${delta}点（今日は増えただけ）` :
    "前回と同じ。安定できています";

  const subline =
    delta === null ? "変化は少しずつでOK。続けるほど楽になります。" :
    delta < 0 ? `目安：1日あたり約 ${recoveredMinutesPerDay} 分の時間を取り戻す方向です（推定）` :
    delta > 0 ? "疲れやストレスの日は増えやすいです。まずは深呼吸。環境を整えるだけで楽になります。" :
    "維持できるのは立派。次は環境を整えるとラクになります。";

  // ===== 表彰状カード（勝利の瞬間ファースト） =====
  const certificate = (() => {
    // ベスト更新が最優先
    if (isBestUpdate && testTotalScore !== null) {
      return {
        title: "🏆 自己ベスト更新！",
        big: `スコア ${testTotalScore}`,
        stamp: "BEST SCORE",
        message: "この記録は\"保存版\"です。次も同じ流れでいけます。",
      };
    }

    // ✅ 依存度レベルに応じたスタンプ（英語ラベル）
    const levelStamp = (() => {
      const lv = testResult?.level;
      if (lv === "低依存") return "PERFECT";
      if (lv === "軽度依存") return "CAUTION";
      if (lv === "中度依存") return "ACTION";
      if (lv === "重度依存") return "ALERT";
      return "CHECKED";
    })();

    if (delta === null) {
      return {
        title: "📄 診断完了",
        big: `スコア ${testTotalScore ?? "—"}`,
        stamp: levelStamp,
        message: subline,
      };
    }
    if (delta < 0) {
      return {
        title: `🎉 前回より ${delta}点！`,
        big: `${delta}点`,
        stamp: levelStamp,
        message: subline,
      };
    }
    if (delta > 0) {
      return {
        title: `🛠 今日は増えた日（+${delta}）`,
        big: `+${delta}点`,
        stamp: levelStamp,
        message: subline,
      };
    }
    return {
      title: "🥱 安定キープ！",
      big: "±0点",
      stamp: levelStamp,
      message: subline,
    };
  })();

  // ===== CERTIFICATEスタンプ：状態ごとに色＆点滅 =====
  const stampTheme = (() => {
    switch (certificate.stamp) {
      case "BEST SCORE":
        return { base: "border-amber-300/70 bg-amber-50", text: "text-amber-800", blink: "rgba(245,158,11,0.55)" };

      // ✅ レベル（PERFECT/CAUTION/ACTION/ALERT）に応じて色を変更
      case "PERFECT":
        return { base: "border-emerald-300/70 bg-emerald-50", text: "text-emerald-800", blink: "rgba(16,185,129,0.50)" };
      case "CAUTION":
        return { base: "border-yellow-300/70 bg-yellow-50", text: "text-yellow-800", blink: "rgba(234,179,8,0.50)" };
      case "ACTION":
        return { base: "border-orange-300/70 bg-orange-50", text: "text-orange-800", blink: "rgba(249,115,22,0.50)" };
      case "ALERT":
        return { base: "border-rose-300/70 bg-rose-50", text: "text-rose-800", blink: "rgba(244,63,94,0.50)" };

      case "CHECKED":
        return { base: "border-slate-300/70 bg-slate-50", text: "text-slate-700", blink: "rgba(148,163,184,0.45)" };
      default:
        return { base: "border-indigo-300/70 bg-indigo-50", text: "text-indigo-800", blink: "rgba(99,102,241,0.50)" };
    }
  })();

  const stampStyle = {
    ["--dw-blink" as any]: stampTheme.blink,
  } as React.CSSProperties;

  // ===== グラフ =====
  const recent = (testHistory ?? []).slice(0, 10).reverse();
  const scoresChrono = recent.map(r => r.score);
  const isImprovedPoint = scoresChrono.map((v, i) => i === 0 ? false : v < scoresChrono[i - 1]);
  const minInRecent = scoresChrono.length ? Math.min(...scoresChrono) : null;
  const isBestPoint = scoresChrono.map(v => (minInRecent !== null) && v === minInRecent);
  const movingAvg3 = scoresChrono.map((_, i) => {
    const start = Math.max(0, i - 2);
    const slice = scoresChrono.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    return Number(avg.toFixed(1));
  });

  const pointRadius = scoresChrono.map(() => 4);
  const pointBg = scoresChrono.map<string>((_, i) => (isBestPoint[i] ? "#f59e0b" : "#6366F1"));
  const pointStyle = scoresChrono.map((_, i) => (isBestPoint[i] ? bestPointStyle : "circle"));
  // ✅ 最新ポイント（右端）を赤色に固定（点滅なし）
  const lastIdx = scoresChrono.length - 1;
  if (lastIdx >= 0) {
    pointBg[lastIdx] = "#ef4444";
    pointRadius[lastIdx] = 5;
    pointStyle[lastIdx] = isBestPoint[lastIdx] ? latestStarPointStyle : "circle";
  }


  

  
  // ===== 推移グラフ 背景色（スコア帯） =====
  const scoreBandsPlugin = {
    id: "scoreBands",
    beforeDraw(chart: any, _args: any, opts: any) {
      const { ctx, chartArea, scales } = chart;
      if (!ctx || !chartArea || !scales?.y) return;
      const yScale = scales.y;
      const bands = (opts?.bands ?? []) as { from: number; to: number; color: string }[];
      if (!bands.length) return;

      const { left, right, top, bottom } = chartArea;
      ctx.save();
      for (const b of bands) {
        const yTop = yScale.getPixelForValue(b.to);
        const yBottom = yScale.getPixelForValue(b.from);
        const y = Math.max(top, Math.min(yTop, yBottom));
        const h = Math.min(bottom, Math.max(yTop, yBottom)) - y;
        if (h > 0) {
          ctx.fillStyle = b.color;
          ctx.fillRect(left, y, right - left, h);
        }
      }
      ctx.restore();
    },
  };
const sparkData = {
    labels: recent.map(r => r.date),
    datasets: [
      {
        label: "スコア",
        data: scoresChrono,
        borderColor: "#6366F1",
        backgroundColor: "rgba(99,102,241,0.12)",
        tension: 0.35,
        pointRadius,
        pointBackgroundColor: pointBg,
        pointStyle,
        pointBorderWidth: 0,
        pointHoverBorderWidth: 0,
        borderWidth: 2,
        fill: true,
      }
    ]
  };

  const sparkOptions = {
    animation: { duration: 0 },
    animations: { colors: { duration: 0 }, numbers: { duration: 0 } },
    transitions: {
      active: { animation: { duration: 0 } },
      resize: { animation: { duration: 0 } },
      show: { animation: { duration: 0 } },
      hide: { animation: { duration: 0 } },
    },

    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        displayColors: false,
        padding: 10,
        backgroundColor: "rgba(17,24,39,0.92)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255,255,255,0.15)",
        borderWidth: 1,
        callbacks: {
          title: (items: any) => items?.[0]?.label ?? "",
          label: (item: any) => {
            const i = item.dataIndex;
            const y = item.parsed.y;
            const best = !!isBestPoint?.[i];
            return `スコア: ${y}${best ? "（★ベスト）" : ""}`;
          },
          afterLabel: (item: any) => {
            const i = item.dataIndex;
            const curr = item.parsed.y;
            const prev = i > 0 ? scoresChrono[i - 1] : null;
            if (prev === null || prev === undefined) return "";
            const d = curr - prev;
            const sign = d > 0 ? "+" : "";
            return `前回比: ${sign}${d}`;
          },
        },
      },
      // 背景の色帯（スコア帯をわかりやすく）
      scoreBands: {
        bands: [
          { from: 0, to: 6, color: "rgba(34,197,94,0.10)" },
          { from: 6, to: 14, color: "rgba(250,204,21,0.10)" },
          { from: 14, to: 23, color: "rgba(249,115,22,0.10)" },
          { from: 23, to: 30, color: "rgba(244,63,94,0.10)" },
        ],
      },
    },
    interaction: {
      mode: "nearest",
      intersect: true,
    },
    elements: {
      point: {
        hitRadius: 10,
        hoverRadius: 6,
        borderWidth: 0,
        hoverBorderWidth: 0,
      },
      line: {
        borderWidth: 2,
      },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: {
          autoSkip: false,
          maxTicksLimit: 10,
          color: "#6b7280",
          font: { size: 10, weight: "bold" },
          callback: (value: any, index: number) => {
            const label = (recent[index]?.date ?? "").replace(/-/g, "/");
            return label.length >= 10 ? label.slice(5) : label;
          },
        },
      },
      y: {
        display: true,
        beginAtZero: true,
        suggestedMax: 30,
        ticks: {
          stepSize: 5,
          color: "#6b7280",
          font: { size: 10, weight: "bold" },
        },
        grid: { color: "rgba(107,114,128,0.15)" },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} className="relative">
      {/* ===== 外側（黒背景）FX：派手 ===== */}
      <div className={`dwfx-outer ${fxMode}`} aria-hidden="true">
        <div className="dwfx-outer__grad" />
        <div className="dwfx-outer__noise" />
        <div className="dwfx-outer__glow" />
        <div className="dwfx-outer__streak" />
        <div className="dwfx-outer__particles">
          {Array.from({ length: 54 }).map((_, i) => (
            <span key={i} className={`p p${i + 1}`} />
          ))}
        </div>
      </div>

      {/* 暗幕（黒背景） */}
      <div style={{ position: "fixed", inset: 0, zIndex: 99990 }} className="bg-gray-900/80" aria-hidden="true" />

      {/* ✅ ポップアップ外：左右端帯から出現→自然フェードアウト（落下なし・CSS疑似ランダム） */}
      <div className={`dwfx-emoji-pop ${fxMode}`} aria-hidden="true">
        {fxMode === "good" && (
          <>
            {Array.from({ length: 40 }).map((_, i) => (
              <span key={i} className={`ep ep${i + 1}`}>
                <span className="epi">{i % 3 === 0 ? "✨" : "🎉"}</span>
              </span>
            ))}
          </>
        )}
        {fxMode === "bad" && (
          <>
            {Array.from({ length: 40 }).map((_, i) => (
              <span key={i} className={`ep ep${i + 1}`}>
                <span className="epi">{i % 3 === 0 ? "🔥" : "⚠️"}</span>
              </span>
            ))}
          </>
        )}
        {fxMode === "neutral" && (
          <>
            {Array.from({ length: 40 }).map((_, i) => (
              <span key={i} className={`ep ep${i + 1}`}>
                <span className="epi">{i % 3 === 0 ? "💫" : "⭐"}</span>
              </span>
            ))}
          </>
        )}
      </div>

      {/* ===== モーダル本体 ===== */}
      <div
        ref={modalBodyRef}
        style={{ position: "relative", zIndex: 99995, width: "100%", maxWidth: 800, maxHeight: "96vh" }}
        className="bg-white w-full max-w-[92vw] md:max-w-[800px] max-h-[96vh] overflow-y-auto rounded-lg shadow-2xl p-2 md:p-4 relative dw-gray-strong"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 内側FX */}
        <div className={`dwfx-inner ${fxMode}`} aria-hidden="true">
          <div className="dwfx-inner__grad" />
          <div className="dwfx-inner__spark" />
          <div className="dwfx-inner__bubble" />
        </div>

        <button
          onClick={() => setIsModalOpen(false)}
          className="sticky top-2 ml-auto block text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200 z-10"
          aria-label="閉じる"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <h3 className="font-extrabold text-indigo-700 text-3xl mb-4 border-b pb-2 flex items-center relative z-10">
          <span className="text-4xl mr-2">📱</span> スマートフォン依存度 診断テスト
        </h3>

{testResult && style ? (
          <div className={`mt-4 p-6 ${style.bg} border-2 ${style.border} rounded-xl shadow-inner relative z-10`}>
           <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm border border-indigo-100 shadow-sm p-5 md:p-6 mb-4">
              {/* 右端の背景（リボン）を残す */}
              <div className="absolute -right-24 -top-24 h-56 w-56 rotate-12 rounded-full bg-gradient-to-br from-indigo-200/70 via-emerald-200/40 to-amber-200/30" />

              <div className="relative flex items-start justify-between gap-3">
                <p className="text-[11px] font-extrabold tracking-widest text-indigo-600">CERTIFICATE</p>
                <div
                  className={`dw-stamp-blink absolute right-4 top-4 translate-x-1/2 -translate-y-1/2 z-10 grid place-items-center rounded-full border-4 ${stampTheme.base} h-14 w-14 md:h-18 md:w-18 rotate-6 shadow-sm`}
                  style={stampStyle}
                >
                  <span
                    className={`text-[10px] md:text-[11px] font-extrabold ${stampTheme.text} text-center px-2 dw-text-blink ${certificate.stamp === "BEST SCORE" ? "leading-tight whitespace-normal" : "leading-none whitespace-nowrap"}`}
                    style={stampStyle}
                  >
                    {certificate.stamp === "BEST SCORE" ? <>BEST<br/>SCORE</> : certificate.stamp}
                  </span>
                </div>
              </div>

              {/* ✅ CERTIFICATE直下：信号（4段階）＋現在位置 */}
              {(() => {
                const s = testTotalScore;
                const band =
                  s == null ? null :
                  s <= 6 ? 0 :
                  s <= 14 ? 1 :
                  s <= 23 ? 2 : 3;

                const bands = [
                  { label: "低", range: "0–6", bg: "bg-green-500/80", ring: "ring-green-500/50", text: "text-green-800" },
                  { label: "軽", range: "7–14", bg: "bg-yellow-500/80", ring: "ring-yellow-500/50", text: "text-yellow-900" },
                  { label: "中", range: "15–23", bg: "bg-orange-500/80", ring: "ring-orange-500/50", text: "text-orange-900" },
                  { label: "重", range: "24–30", bg: "bg-red-500/80", ring: "ring-red-500/50", text: "text-red-800" },
                ];

                return (
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-700">
                        スコア{' '}
                        <span className={`text-xl font-extrabold ${style?.scoreText ?? "text-gray-800"} dw-text-blink`} style={stampStyle}>{s ?? "—"}</span>
                        <span className="text-xl text-gray-40"> / {MAX_SCORE}</span>
                      </p>
                    </div>

                    <div className="mt-2 grid grid-cols-4 gap-1">
                      {bands.map((b, i) => (
                        <div key={i} className="relative">
                          <div
                            className={[
                              "h-2 rounded",
                              b.bg,
                              band === i ? `ring-2 ring-offset-2 ${b.ring}` : "",
                            ].join(" ")}
                            aria-label={`${b.label}（${b.range}）`}
                          />
                          {band === i && (
                            <div className={`absolute left-1/2 -translate-x-1/2 top-2.5 text-[14px] font-black text-indigo-600 drop-shadow`}>▲</div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 flex justify-between text-[11px] font-extrabold text-gray-500 dw-lowhigh">
                      <span>低</span>
                      <span>高</span>
                    </div>

                    <div className="mt-1 flex justify-between text-[11px] font-extrabold text-gray-600">
                      {bands.map((b, i) => (
                        <span key={i} className="w-1/4 text-center">{b.label}（{b.range}）</span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 💬・判定・おすすめ：CERTIFICATE内に表示 */}
              <div className="relative mt-4 space-y-3">
                

                <p className="text-sm font-bold text-gray-700">
                  判定レベル: <span className={`${style.scoreText} text-xl font-extrabold dw-text-blink`} style={stampStyle}>{testResult.level}</span>
                </p>

                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                  <p className="text-[11px] font-extrabold text-indigo-700 mb-1">おすすめの行動指針</p>
                  <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{testResult.recommendation}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-indigo-100 shadow-sm p-4 md:p-5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-extrabold text-indigo-700">最近の推移（最新10件）<span className="ml-2 text-xs text-gray-500">※スコアは低いほど良い</span></p>
                <span className="text-xs text-gray-500 font-bold">⭐=ベスト ／ 🔴=最新</span>
              </div>
              <div className="h-44">
                <ResourceChart type="line" data={sparkData} options={sparkOptions} plugins={[scoreBandsPlugin]} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} />
              </div>
            </div>
            {!isLoggedIn && (
              <div className="mb-4 p-4 bg-white/95 rounded-lg border-l-4 border-indigo-500 shadow-sm">
                <p className="text-sm text-gray-700">
                  この結果は表示のみです。<span className="font-bold text-indigo-700">履歴に保存するにはログイン</span>してください。
                </p>
                <div className="mt-3">
                  <button onClick={onLoginForHistory} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md">
                    ログインして履歴保存
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 mt-8">
              <div className="ml-auto flex items-center gap-3">
                <button onClick={resetTest} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base rounded-full shadow-lg transition transform hover:scale-[1.02]">
                  再診断する
                </button>
                <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 bg-gray-500 hover:bg-gray-600 text-white font-extrabold text-base rounded-full shadow-lg transition transform hover:scale-[1.02]">
                  閉じる
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 relative z-10">
            {testQuestions.map((question: string, index: number) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                <p className="font-bold text-gray-800 mb-3">Q{index + 1}. {question}</p>
                <div className="flex flex-wrap gap-3">
                  {options.map((option) => (
                    <label
                      key={option.score}
                      className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition duration-150 ease-in-out text-sm font-semibold ${option.class} ${(safeAnswers as any)[index] === option.score ? "ring-4 ring-offset-2" : ""}`}
                      onClick={handleOptionClick}
                    >
                      <input type="radio" name={`question-${index}`} value={option.score} checked={(safeAnswers as any)[index] === option.score} onChange={() => handleAnswerChange(index, option.score)} className="sr-only" />
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

        {/* ===== CSS（通常の <style>：環境差に強い） ===== */}
  <style>{`
/* 右端の背景に重なって薄く見える「低/高」対策 */
.dw-gray-strong .dw-lowhigh{ position:relative; z-index:20; }
.dw-gray-strong .dw-lowhigh span{ text-shadow: 0 1px 0 rgba(255,255,255,0.95), 0 0 10px rgba(255,255,255,0.65); }

/* ===== モーダル内のグレー文字を統一（dw-gray-strong） ===== */
.dw-gray-strong .text-gray-400,
.dw-gray-strong .text-gray-500,
.dw-gray-strong .text-gray-600{
  color:#4b5563 !important; /* Tailwind gray-600 */
}

/* ===== 点滅はスタンプ（枠）だけ：テキスト点滅を無効化 ===== */
.dw-gray-strong .dw-text-blink{
  animation: none !important;
  text-shadow: none !important;
  filter: none !important;
}

/* ===== CERTIFICATEスタンプ点滅（状態色はCSS変数 --dw-blink） ===== */
.dw-stamp-blink::after{
  content:"";
  position:absolute;
  inset:-8px;
  border-radius:9999px;
  background: radial-gradient(circle at 50% 50%, var(--dw-blink), transparent 65%);
  opacity:0;
  pointer-events:none;
}
.dw-stamp-blink{
  animation: dwStampBlink 1.8s ease-in-out infinite;
}
@keyframes dwStampBlink{
  0%,100%{ box-shadow: 0 0 0 rgba(0,0,0,0); filter: saturate(1); }
  50%{ box-shadow: 0 0 26px var(--dw-blink); filter: saturate(1.15); }
}
.dw-stamp-blink{ will-change: box-shadow, filter; }
.dw-stamp-blink:hover{ animation-play-state: paused; }

/* ===== 判定レベル/スコア/スタンプ文字 点滅：スタンプと同じ発光感 ===== */
.dw-text-blink{ animation: dwTextBlink 1.8s ease-in-out infinite; will-change: text-shadow, filter; }
@keyframes dwTextBlink{
  0%,100%{ text-shadow: 0 0 0 rgba(0,0,0,0); filter: saturate(1); }
  50%{ text-shadow: 0 0 14px var(--dw-blink), 0 0 26px var(--dw-blink); filter: saturate(1.15); }
}
.dw-text-blink:hover{ animation-play-state: paused; }
@media (prefers-reduced-motion: reduce){ .dw-text-blink{ animation: none !important; } }

@media (prefers-reduced-motion: reduce){
  .dw-stamp-blink{ animation: none !important; }
  .dw-stamp-blink::after{ display:none; }
}

          @media (prefers-reduced-motion: reduce){
            .dwfx-outer *, .dwfx-inner *, .dwfx-emoji-pop *{ animation: none !important; }
          }

          /* ===== 外側FX ===== */
          .dwfx-outer{ position:absolute; inset:0; pointer-events:none; z-index:0; overflow:hidden; }
          .dwfx-outer__grad{ position:absolute; inset:-30%; opacity:.75; filter: blur(1px); animation: dwOuterMove 6.8s ease-in-out infinite; }
          .dwfx-outer.good .dwfx-outer__grad{ background:
            radial-gradient(circle at 18% 18%, rgba(59,130,246,.75), transparent 58%),
            radial-gradient(circle at 82% 26%, rgba(34,197,94,.55), transparent 60%),
            radial-gradient(circle at 48% 92%, rgba(99,102,241,.55), transparent 60%),
            linear-gradient(120deg, rgba(2,6,23,.82), rgba(15,23,42,.82)); }
          .dwfx-outer.neutral .dwfx-outer__grad{ background:
            radial-gradient(circle at 18% 18%, rgba(99,102,241,.55), transparent 58%),
            radial-gradient(circle at 82% 26%, rgba(148,163,184,.40), transparent 60%),
            linear-gradient(120deg, rgba(2,6,23,.88), rgba(15,23,42,.88)); }
          .dwfx-outer.bad .dwfx-outer__grad{ background:
            radial-gradient(circle at 20% 18%, rgba(244,63,94,.75), transparent 58%),
            radial-gradient(circle at 80% 26%, rgba(245,158,11,.65), transparent 60%),
            radial-gradient(circle at 50% 92%, rgba(251,191,36,.35), transparent 65%),
            linear-gradient(120deg, rgba(2,6,23,.92), rgba(24,24,27,.92)); }

          .dwfx-outer__noise{ position:absolute; inset:0; opacity:.22; mix-blend-mode: overlay;
            background-image: radial-gradient(rgba(255,255,255,.25) 1px, transparent 1px);
            background-size: 16px 16px;
            animation: dwNoise 1.9s linear infinite;
          }
          .dwfx-outer__glow{ position:absolute; inset:-10%; opacity:.25; filter: blur(12px); mix-blend-mode: screen;
            background: radial-gradient(circle at 50% 50%, rgba(255,255,255,.30), transparent 60%);
            animation: dwGlow 4.2s ease-in-out infinite;
          }

          .dwfx-outer__streak{ position:absolute; inset:-40%; opacity:0; mix-blend-mode: screen; }
          .dwfx-outer.bad .dwfx-outer__streak{ opacity:.42;
            background: repeating-linear-gradient(115deg,
              rgba(244,63,94,0) 0 18px,
              rgba(244,63,94,.18) 18px 26px,
              rgba(245,158,11,0) 26px 52px);
            animation: dwStreak 1.15s linear infinite;
          }

          @keyframes dwOuterMove{ 0%{ transform:translate(0,0) scale(1);} 50%{ transform:translate(22px,-18px) scale(1.04);} 100%{ transform:translate(0,0) scale(1);} }
          @keyframes dwNoise{ 0%{ transform:translate(0,0);} 50%{ transform:translate(12px,-10px);} 100%{ transform:translate(0,0);} }
          @keyframes dwGlow{ 0%{ transform:scale(1);} 50%{ transform:scale(1.05);} 100%{ transform:scale(1);} }
          @keyframes dwStreak{ 0%{ transform:translateX(-7%) translateY(2%);} 100%{ transform:translateX(7%) translateY(-6%);} }

          /* 粒子 */
          .dwfx-outer__particles{ position:absolute; inset:0; }
          .dwfx-outer__particles .p{ position:absolute; width:10px; height:10px; border-radius:9999px; opacity:0;
            background: rgba(255,255,255,.70);
            box-shadow: 0 0 22px rgba(255,255,255,.25);
            animation: dwParticle 3.2s ease-in-out infinite;
          }
          .dwfx-outer.good .dwfx-outer__particles .p{ background: rgba(191,219,254,.75); }
          .dwfx-outer.bad .dwfx-outer__particles .p{ background: rgba(251,191,36,.80); box-shadow: 0 0 22px rgba(244,63,94,.28); }

          @keyframes dwParticle{ 0%{ transform:translateY(18px) scale(.8); opacity:0;} 20%{ opacity:.95;} 70%{ transform:translateY(-180px) scale(1.2); opacity:.65;} 100%{ transform:translateY(-300px) scale(.95); opacity:0;} }

          /* 粒子配置（54個：固定で軽量） */
                    .p1{ left:7%; top:73%; animation-delay:0.25s; }
          .p2{ left:14%; top:78%; animation-delay:0.50s; }
          .p3{ left:21%; top:83%; animation-delay:0.75s; }
          .p4{ left:28%; top:88%; animation-delay:1.00s; }
          .p5{ left:35%; top:93%; animation-delay:1.25s; }
          .p6{ left:42%; top:98%; animation-delay:1.50s; }
          .p7{ left:49%; top:71%; animation-delay:1.75s; }
          .p8{ left:56%; top:76%; animation-delay:2.00s; }
          .p9{ left:63%; top:81%; animation-delay:2.25s; }
          .p10{ left:70%; top:86%; animation-delay:0.00s; }
          .p11{ left:77%; top:91%; animation-delay:0.25s; }
          .p12{ left:84%; top:96%; animation-delay:0.50s; }
          .p13{ left:91%; top:69%; animation-delay:0.75s; }
          .p14{ left:2%; top:74%; animation-delay:1.00s; }
          .p15{ left:9%; top:79%; animation-delay:1.25s; }
          .p16{ left:16%; top:84%; animation-delay:1.50s; }
          .p17{ left:23%; top:89%; animation-delay:1.75s; }
          .p18{ left:30%; top:94%; animation-delay:2.00s; }
          .p19{ left:37%; top:99%; animation-delay:2.25s; }
          .p20{ left:44%; top:72%; animation-delay:0.00s; }
          .p21{ left:51%; top:77%; animation-delay:0.25s; }
          .p22{ left:58%; top:82%; animation-delay:0.50s; }
          .p23{ left:65%; top:87%; animation-delay:0.75s; }
          .p24{ left:72%; top:92%; animation-delay:1.00s; }
          .p25{ left:79%; top:97%; animation-delay:1.25s; }
          .p26{ left:86%; top:70%; animation-delay:1.50s; }
          .p27{ left:93%; top:75%; animation-delay:1.75s; }
          .p28{ left:4%; top:80%; animation-delay:2.00s; }
          .p29{ left:11%; top:85%; animation-delay:2.25s; }
          .p30{ left:18%; top:90%; animation-delay:0.00s; }
          .p31{ left:25%; top:95%; animation-delay:0.25s; }
          .p32{ left:32%; top:68%; animation-delay:0.50s; }
          .p33{ left:39%; top:73%; animation-delay:0.75s; }
          .p34{ left:46%; top:78%; animation-delay:1.00s; }
          .p35{ left:53%; top:83%; animation-delay:1.25s; }
          .p36{ left:60%; top:88%; animation-delay:1.50s; }
          .p37{ left:67%; top:93%; animation-delay:1.75s; }
          .p38{ left:74%; top:98%; animation-delay:2.00s; }
          .p39{ left:81%; top:71%; animation-delay:2.25s; }
          .p40{ left:88%; top:76%; animation-delay:0.00s; }
          .p41{ left:95%; top:81%; animation-delay:0.25s; }
          .p42{ left:6%; top:86%; animation-delay:0.50s; }
          .p43{ left:13%; top:91%; animation-delay:0.75s; }
          .p44{ left:20%; top:96%; animation-delay:1.00s; }
          .p45{ left:27%; top:69%; animation-delay:1.25s; }
          .p46{ left:34%; top:74%; animation-delay:1.50s; }
          .p47{ left:41%; top:79%; animation-delay:1.75s; }
          .p48{ left:48%; top:84%; animation-delay:2.00s; }
          .p49{ left:55%; top:89%; animation-delay:2.25s; }
          .p50{ left:62%; top:94%; animation-delay:0.00s; }
          .p51{ left:69%; top:99%; animation-delay:0.25s; }
          .p52{ left:76%; top:72%; animation-delay:0.50s; }
          .p53{ left:83%; top:77%; animation-delay:0.75s; }
          .p54{ left:90%; top:82%; animation-delay:1.00s; }
/* ===== 内側FX ===== */
          .dwfx-inner{ position:absolute; inset:0; pointer-events:none; z-index:0; overflow:hidden; border-radius: 12px; }
          .dwfx-inner__grad{ position:absolute; inset:-25%; opacity:.42; animation: dwInnerMove 6.5s ease-in-out infinite; }
          .dwfx-inner.good .dwfx-inner__grad{ background:
            radial-gradient(circle at 18% 20%, rgba(99,102,241,.45), transparent 55%),
            radial-gradient(circle at 80% 30%, rgba(34,197,94,.28), transparent 60%),
            linear-gradient(120deg, rgba(255,255,255,.70), rgba(238,242,255,.45)); }
          .dwfx-inner.neutral .dwfx-inner__grad{ background:
            radial-gradient(circle at 18% 20%, rgba(99,102,241,.32), transparent 55%),
            linear-gradient(120deg, rgba(255,255,255,.72), rgba(243,244,246,.45)); }
          .dwfx-inner.bad .dwfx-inner__grad{ background:
            radial-gradient(circle at 18% 20%, rgba(244,63,94,.34), transparent 55%),
            radial-gradient(circle at 82% 28%, rgba(245,158,11,.22), transparent 60%),
            linear-gradient(120deg, rgba(255,255,255,.72), rgba(249,250,251,.40)); }

          .dwfx-inner__spark{ position:absolute; inset:0; opacity:.40; mix-blend-mode: screen;
            background-image: radial-gradient(rgba(255,255,255,.65) 1.2px, transparent 1.2px);
            background-size: 20px 20px;
            animation: dwSpark 2.8s linear infinite;
          }
          .dwfx-inner.bad .dwfx-inner__spark{ opacity:.52;
            background-image: radial-gradient(rgba(251,191,36,.60) 1.2px, transparent 1.2px);
          }

          .dwfx-inner__bubble{ position:absolute; inset:0; opacity:.55; mix-blend-mode: overlay;
            background:
              radial-gradient(circle at 10% 86%, rgba(255,255,255,.75) 0 16px, transparent 17px),
              radial-gradient(circle at 28% 92%, rgba(255,255,255,.60) 0 12px, transparent 13px),
              radial-gradient(circle at 52% 88%, rgba(255,255,255,.68) 0 18px, transparent 19px),
              radial-gradient(circle at 76% 94%, rgba(255,255,255,.55) 0 10px, transparent 11px),
              radial-gradient(circle at 92% 82%, rgba(255,255,255,.60) 0 14px, transparent 15px);
            animation: dwBubbles 3.8s ease-in-out infinite;
          }
          .dwfx-inner.bad .dwfx-inner__bubble{ opacity:.45; filter:saturate(1.25);
            background:
              radial-gradient(circle at 20% 88%, rgba(251,191,36,.45) 0 16px, transparent 17px),
              radial-gradient(circle at 78% 90%, rgba(244,63,94,.32) 0 18px, transparent 19px);
            animation: dwPulse 1.9s ease-in-out infinite;
          }

          @keyframes dwInnerMove{ 0%{ transform:translate(0,0) scale(1);} 50%{ transform:translate(14px,-12px) scale(1.02);} 100%{ transform:translate(0,0) scale(1);} }
          @keyframes dwSpark{ 0%{ transform:translate(0,0);} 100%{ transform:translate(20px,-20px);} }
          @keyframes dwBubbles{ 0%{ transform:translateY(0);} 50%{ transform:translateY(-12px);} 100%{ transform:translateY(0);} }
          @keyframes dwPulse{ 0%{ opacity:.28;} 50%{ opacity:.60;} 100%{ opacity:.28;} }
        

/* ===== ポップアップ内：絵文字レイン（上から降る） ===== */
.dwfx-emoji-rain{ position:absolute; inset:0; z-index:99998; pointer-events:none; overflow:hidden; }
.dwfx-emoji-rain.neutral{ opacity:.55; }
.dwfx-emoji-rain.good{ opacity:.9; }
.dwfx-emoji-rain.bad{ opacity:.9; }
.dwfx-emoji-rain .er{
  position:absolute;
  top:-40px;
  font-size: 20px;
  line-height: 1;
  opacity: 0;
  filter: drop-shadow(0 10px 14px rgba(0,0,0,.18));
  animation: dwEmojiFall 2.6s linear infinite;
}
.dwfx-emoji-rain.good .er{ filter: drop-shadow(0 12px 16px rgba(16,185,129,.24)); }
.dwfx-emoji-rain.bad .er{ filter: drop-shadow(0 12px 16px rgba(244,63,94,.26)); }

/* ===== ポップアップ外：左右端帯から出現→自然フェードアウト（落下なし） ===== */
.dwfx-emoji-pop{ position: fixed; inset: 0; z-index: 99993; pointer-events: none; overflow: hidden; }
.dwfx-emoji-pop .ep{ position: absolute; opacity: 0; animation: dwPopFade var(--dur, 1400ms) ease-out infinite; animation-delay: var(--delay, -0.2s); will-change: opacity, transform; }
.dwfx-emoji-pop .epi{ display: inline-block; animation: dwDrift var(--dr, 2.4s) ease-in-out infinite, dwTwinkle var(--tw, 1.6s) ease-in-out infinite; filter: drop-shadow(0 10px 14px rgba(0,0,0,.18)); will-change: transform, opacity; }
.dwfx-emoji-pop.good .epi{ filter: drop-shadow(0 12px 16px rgba(16,185,129,.22)); }
.dwfx-emoji-pop.bad .epi{ filter: drop-shadow(0 12px 16px rgba(244,63,94,.24)); }
@keyframes dwPopFade{ 0%{ opacity:0; transform: scale(.92); } 12%{ opacity:1; } 70%{ opacity:.90; transform: scale(1.00);} 100%{ opacity:0; transform: scale(1.06);} }
@keyframes dwDrift{ 0%{ transform: translateX(0px);} 25%{ transform: translateX(var(--dx1, 10px)); } 50%{ transform: translateX(calc(var(--dx1, 10px) * -1)); } 75%{ transform: translateX(var(--dx2, 6px)); } 100%{ transform: translateX(0px);} }
@keyframes dwTwinkle{ 0%,100%{ opacity:.78;} 18%{ opacity:1;} 55%{ opacity:.55;} 82%{ opacity:.95;} }
@media (prefers-reduced-motion: reduce){ .dwfx-emoji-pop *{ animation: none !important; } }

/* ===== 左右端帯のみ：疑似ランダム配置（ep1〜ep40） ===== */
.ep1  { left:  3.2%; top: 14.0%; --dur: 1580ms; --delay:-0.42s; --tw:1.38s; --dr:2.62s; --dx1:12px; --dx2: 7px; font-size:24px; }
.ep2  { left: 95.4%; top: 18.5%; --dur: 1320ms; --delay:-1.76s; --tw:2.06s; --dr:2.14s; --dx1: 9px; --dx2:11px; font-size:20px; }
.ep3  { left:  7.8%; top: 26.2%; --dur: 1760ms; --delay:-0.88s; --tw:1.72s; --dr:3.18s; --dx1:14px; --dx2: 6px; font-size:28px; }
.ep4  { left: 83.1%; top: 12.8%; --dur: 1200ms; --delay:-2.08s; --tw:1.46s; --dr:2.88s; --dx1: 8px; --dx2:13px; font-size:19px; }
.ep5  { left: 15.6%; top: 20.1%; --dur: 1410ms; --delay:-1.22s; --tw:2.18s; --dr:2.36s; --dx1:10px; --dx2: 8px; font-size:22px; }
.ep6  { left: 90.7%; top: 34.4%; --dur: 1640ms; --delay:-0.64s; --tw:1.30s; --dr:3.28s; --dx1:15px; --dx2: 7px; font-size:26px; }
.ep7  { left:  4.9%; top: 42.0%; --dur: 1290ms; --delay:-1.94s; --tw:1.90s; --dr:2.54s; --dx1: 7px; --dx2:12px; font-size:20px; }
.ep8  { left: 97.2%; top: 27.6%; --dur: 1850ms; --delay:-0.38s; --tw:2.22s; --dr:2.02s; --dx1:11px; --dx2: 6px; font-size:29px; }
.ep9  { left: 11.4%; top: 36.8%; --dur: 1500ms; --delay:-1.10s; --tw:1.58s; --dr:3.06s; --dx1:13px; --dx2: 9px; font-size:23px; }
.ep10 { left: 84.9%; top: 46.7%; --dur: 1180ms; --delay:-2.22s; --tw:1.34s; --dr:2.72s; --dx1: 8px; --dx2:10px; font-size:18px; }
.ep11 { left:  2.7%; top: 54.9%; --dur: 1670ms; --delay:-0.72s; --tw:2.10s; --dr:2.26s; --dx1:14px; --dx2: 6px; font-size:27px; }
.ep12 { left: 92.0%; top: 58.1%; --dur: 1380ms; --delay:-1.48s; --tw:1.44s; --dr:3.32s; --dx1:10px; --dx2:13px; font-size:21px; }
.ep13 { left: 17.3%; top: 63.6%; --dur: 1600ms; --delay:-0.54s; --tw:1.86s; --dr:2.92s; --dx1: 9px; --dx2:11px; font-size:25px; }
.ep14 { left: 88.6%; top: 66.2%; --dur: 1240ms; --delay:-2.34s; --tw:2.34s; --dr:2.12s; --dx1:12px; --dx2: 7px; font-size:19px; }
.ep15 { left:  6.1%; top: 72.4%; --dur: 1720ms; --delay:-0.96s; --tw:1.52s; --dr:3.20s; --dx1:15px; --dx2: 8px; font-size:28px; }
.ep16 { left: 98.0%; top: 74.0%; --dur: 1460ms; --delay:-1.30s; --tw:1.98s; --dr:2.40s; --dx1: 7px; --dx2:12px; font-size:22px; }
.ep17 { left: 12.9%; top: 80.3%; --dur: 1330ms; --delay:-2.10s; --tw:1.28s; --dr:2.84s; --dx1:10px; --dx2: 6px; font-size:20px; }
.ep18 { left: 82.4%; top: 83.2%; --dur: 1870ms; --delay:-0.46s; --tw:2.16s; --dr:3.14s; --dx1:13px; --dx2:10px; font-size:30px; }
.ep19 { left:  9.6%; top: 86.5%; --dur: 1550ms; --delay:-1.06s; --tw:1.64s; --dr:2.52s; --dx1: 8px; --dx2:13px; font-size:23px; }
.ep20 { left: 94.1%; top: 88.8%; --dur: 1210ms; --delay:-2.28s; --tw:1.40s; --dr:2.98s; --dx1:11px; --dx2: 7px; font-size:18px; }
.ep21 { left:  3.9%; top: 22.9%; --dur: 1660ms; --delay:-0.60s; --tw:2.26s; --dr:2.18s; --dx1:14px; --dx2: 6px; font-size:26px; }
.ep22 { left: 87.7%; top: 30.8%; --dur: 1430ms; --delay:-1.62s; --tw:1.54s; --dr:3.36s; --dx1: 9px; --dx2:12px; font-size:21px; }
.ep23 { left: 16.1%; top: 39.2%; --dur: 1765ms; --delay:-0.84s; --tw:1.92s; --dr:2.44s; --dx1:12px; --dx2: 9px; font-size:28px; }
.ep24 { left: 99.0%; top: 41.7%; --dur: 1260ms; --delay:-2.14s; --tw:1.36s; --dr:2.78s; --dx1: 7px; --dx2:10px; font-size:19px; }
.ep25 { left:  5.4%; top: 48.6%; --dur: 1505ms; --delay:-1.18s; --tw:2.12s; --dr:3.08s; --dx1:15px; --dx2: 8px; font-size:24px; }
.ep26 { left: 84.2%; top: 52.1%; --dur: 1880ms; --delay:-0.32s; --tw:1.60s; --dr:2.30s; --dx1:10px; --dx2:13px; font-size:30px; }
.ep27 { left: 13.8%; top: 57.4%; --dur: 1340ms; --delay:-1.98s; --tw:1.30s; --dr:2.90s; --dx1: 8px; --dx2: 6px; font-size:20px; }
.ep28 { left: 96.3%; top: 61.5%; --dur: 1620ms; --delay:-0.70s; --tw:2.40s; --dr:3.22s; --dx1:13px; --dx2: 7px; font-size:26px; }
.ep29 { left:  2.4%; top: 65.8%; --dur: 1450ms; --delay:-1.36s; --tw:1.72s; --dr:2.58s; --dx1:11px; --dx2:12px; font-size:22px; }
.ep30 { left: 90.9%; top: 69.1%; --dur: 1215ms; --delay:-2.26s; --tw:1.42s; --dr:3.00s; --dx1: 9px; --dx2: 8px; font-size:18px; }
.ep31 { left: 10.2%; top: 11.6%; --dur: 1740ms; --delay:-0.94s; --tw:2.08s; --dr:2.12s; --dx1:14px; --dx2: 6px; font-size:28px; }
.ep32 { left: 82.9%; top: 23.4%; --dur: 1385ms; --delay:-1.56s; --tw:1.50s; --dr:3.38s; --dx1:10px; --dx2:13px; font-size:21px; }
.ep33 { left: 18.0%; top: 33.0%; --dur: 1605ms; --delay:-0.52s; --tw:1.96s; --dr:2.40s; --dx1:12px; --dx2: 9px; font-size:25px; }
.ep34 { left: 97.7%; top: 15.2%; --dur: 1245ms; --delay:-2.06s; --tw:1.32s; --dr:2.80s; --dx1: 7px; --dx2:10px; font-size:19px; }
.ep35 { left:  6.8%; top: 44.1%; --dur: 1520ms; --delay:-1.12s; --tw:2.20s; --dr:3.10s; --dx1:15px; --dx2: 8px; font-size:24px; }
.ep36 { left: 85.6%; top: 49.3%; --dur: 1860ms; --delay:-0.36s; --tw:1.62s; --dr:2.32s; --dx1:10px; --dx2:13px; font-size:30px; }
.ep37 { left: 12.1%; top: 60.6%; --dur: 1355ms; --delay:-1.92s; --tw:1.28s; --dr:2.92s; --dx1: 8px; --dx2: 6px; font-size:20px; }
.ep38 { left: 93.5%; top: 56.0%; --dur: 1635ms; --delay:-0.68s; --tw:2.38s; --dr:3.24s; --dx1:13px; --dx2: 7px; font-size:26px; }
.ep39 { left:  2.1%; top: 77.8%; --dur: 1470ms; --delay:-1.28s; --tw:1.70s; --dr:2.56s; --dx1:11px; --dx2:12px; font-size:22px; }
.ep40 { left: 89.2%; top: 81.6%; --dur: 1230ms; --delay:-2.18s; --tw:1.40s; --dr:3.02s; --dx1: 9px; --dx2: 8px; font-size:18px; }

@keyframes dwEmojiFall{
  0%{ transform: translateY(-20px) rotate(0deg); opacity: 0; }
  10%{ opacity: 1; }
  70%{ opacity: .95; }
  100%{ transform: translateY(620px) rotate(360deg); opacity: 0; }
}

.er1{ left:5%; animation-delay:0.17s; animation-duration:2.45s; font-size:20px; }
.er2{ left:10%; animation-delay:0.34s; animation-duration:2.70s; font-size:22px; }
.er3{ left:15%; animation-delay:0.51s; animation-duration:2.95s; font-size:24px; }
.er4{ left:20%; animation-delay:0.68s; animation-duration:3.20s; font-size:18px; }
.er5{ left:25%; animation-delay:0.85s; animation-duration:2.20s; font-size:20px; }
.er6{ left:30%; animation-delay:1.02s; animation-duration:2.45s; font-size:22px; }
.er7{ left:35%; animation-delay:1.19s; animation-duration:2.70s; font-size:24px; }
.er8{ left:40%; animation-delay:1.36s; animation-duration:2.95s; font-size:18px; }
.er9{ left:45%; animation-delay:1.53s; animation-duration:3.20s; font-size:20px; }
.er10{ left:50%; animation-delay:1.70s; animation-duration:2.20s; font-size:22px; }
.er11{ left:55%; animation-delay:1.87s; animation-duration:2.45s; font-size:24px; }
.er12{ left:60%; animation-delay:2.04s; animation-duration:2.70s; font-size:18px; }
.er13{ left:65%; animation-delay:0.00s; animation-duration:2.95s; font-size:20px; }
.er14{ left:70%; animation-delay:0.17s; animation-duration:3.20s; font-size:22px; }
.er15{ left:75%; animation-delay:0.34s; animation-duration:2.20s; font-size:24px; }
.er16{ left:80%; animation-delay:0.51s; animation-duration:2.45s; font-size:18px; }
.er17{ left:85%; animation-delay:0.68s; animation-duration:2.70s; font-size:20px; }
.er18{ left:90%; animation-delay:0.85s; animation-duration:2.95s; font-size:22px; }

        `}</style>
      </div>
    </div>
  );
}));
AddictionTestModal.displayName = "AddictionTestModal";

/* ===============================================
 8. メインコンテンツ
=============================================== */
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

  return { ...app, successRate, ratings, _agg: { successCount: clampedSuccess, ratingSums: safeSums } };
}

const MainContent = ({
  currentUser, users, onOpenAuth, onOpenProfile, onLogout, chartjsConstructor, isChartJsLoaded,
  activeTab, setActiveTab, allHobbies, isHobbyFooterOpen, setIsHobbyFooterOpen,
}: {
  currentUser: User | null; users: User[]; onOpenAuth: () => void; onOpenProfile: () => void; onLogout: () => void;
  chartjsConstructor: ChartConstructor; isChartJsLoaded: boolean;
  activeTab: "diagnosis" | "personalize" | "resources" | "hobby" | "knowledge" | "board";
  setActiveTab: (id: "diagnosis" | "personalize" | "resources" | "hobby" | "knowledge" | "board") => void;
  allHobbies: HobbyWithType[];
  isHobbyFooterOpen: boolean; setIsHobbyFooterOpen: (v: boolean | ((x: boolean) => boolean)) => void;
}) => {
  const [testAnswers, setTestAnswers] = useState<number[]>(initialTestAnswers);
  const [testTotalScore, setTestTotalScore] = useState<number | null>(initialTestScore);
  const [testResult, setTestResult] = useState<{ level: string, recommendation: string } | null>(initialTestResult);
  const [testHistory, setTestHistory] = useState<TestHistoryRecord[]>([]);

  const [appStats, setAppStats] = useState<AppStat[]>(initialAppStats);
  const [isAppStatsLoaded, setIsAppStatsLoaded] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
const [historyFilter, setHistoryFilter] = useState<"10" | "all">("10");
  const HISTORY_LIST_PAGE_SIZE = 20;
  const [historyListPage, setHistoryListPage] = useState(1);

  // フィルタ切替時はページを先頭へ
  useEffect(() => {
    setHistoryListPage(1);
  }, [historyFilter]);

  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<TestHistoryRecord | null>(null);
  const [isHistoryDetailOpen, setIsHistoryDetailOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [surveyTargetApp, setSurveyTargetApp] = useState<AppStat | null>(null);
  const [userRatings, setUserRatings] = useState<UserRatingsMap>({});
  const [hasLoadedUserData, setHasLoadedUserData] = useState(false);

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
setHasLoadedUserData(true);

      const pending = loadFromLocalStorage<PendingResult | null>(KEY_PENDING_RESULT, null);
      if (pending && pending.score !== undefined && pending.level && pending.recommendation) {
        const record: TestHistoryRecord = {
          id: Date.now(),
          date: pending.date ?? formatDate(new Date()),
          score: pending.score,
          level: pending.level,
          recommendation: pending.recommendation,
};
        setTestHistory(prev => [record, ...prev]);
        removeFromLocalStorage(KEY_PENDING_RESULT);
        setTestTotalScore(pending.score);
        setTestResult({ level: pending.level, recommendation: pending.recommendation });
}
    } else {
      setTestAnswers(initialTestAnswers);
      setTestTotalScore(initialTestScore);
      setTestResult(initialTestResult);
      setTestHistory([]);
      setUserRatings({});
setHasLoadedUserData(false);
    }
  }, [currentUser?.id]);

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

  useEffect(() => { if (currentUser && hasLoadedUserData) saveToLocalStorage(KEY_ANSWERS, testAnswers, currentUser.id); }, [testAnswers, currentUser, hasLoadedUserData]);
  useEffect(() => { if (currentUser && hasLoadedUserData) saveToLocalStorage(KEY_SCORE, testTotalScore, currentUser.id); }, [testTotalScore, currentUser, hasLoadedUserData]);
  useEffect(() => { if (currentUser && hasLoadedUserData) saveToLocalStorage(KEY_RESULT, testResult, currentUser.id); }, [testResult, currentUser, hasLoadedUserData]);
  useEffect(() => { if (currentUser && hasLoadedUserData) saveToLocalStorage(KEY_HISTORY, testHistory, currentUser.id); }, [testHistory, currentUser, hasLoadedUserData]);
  useEffect(() => { if (isAppStatsLoaded) saveToLocalStorage(KEY_APP_STATS, appStats); }, [appStats, isAppStatsLoaded]);
  useEffect(() => { if (currentUser && hasLoadedUserData) saveToLocalStorage(KEY_USER_RATINGS, userRatings, currentUser.id); }, [userRatings, currentUser, hasLoadedUserData]);

  const handleAnswerChange = (qIndex: number, score: number) => setTestAnswers(prev => { const n = [...prev]; (n as any)[qIndex] = score; return n; });
  const handleOptionClick = (e: React.MouseEvent) => e.stopPropagation();

  const calculateScore = () => {
    const total = (testAnswers as any).reduce((sum: any, s: any) => sum + (s ?? 0), 0);
    setTestTotalScore(total);
    const { level, recommendation } = getResultFromScore(total);
    setTestResult({ level, recommendation });

    if (currentUser) {
      const newRecord: TestHistoryRecord = {
        id: Date.now(),
        date: formatDate(new Date()),
        score: total,
        level,
        recommendation,
};
      setTestHistory(prev => [newRecord, ...prev]);
    } else {
      const pending: PendingResult = {
        date: formatDate(new Date()),
        score: total,
        level,
        recommendation,
};
      saveToLocalStorage(KEY_PENDING_RESULT, pending);
    }
    setIsModalOpen(true);
  };

  const resetTest = () => { setTestAnswers(new Array(testQuestions.length).fill(null)); setTestTotalScore(null); setTestResult(null); };

  const handleDeleteHistoryItem = (e: React.MouseEvent, recordId: number) => {
    e.stopPropagation();
    if (!currentUser) { onOpenAuth(); return; }
    if (!confirm("この履歴を削除しますか？")) return;
    setTestHistory(prev => prev.filter(item => item.id !== recordId));
  };

  const clearHistory = () => { if (!currentUser) { onOpenAuth(); return; } if (confirm("履歴をすべて削除しますか？")) setTestHistory([]); };

  const openHistoryDetail = (record: TestHistoryRecord) => { setSelectedHistoryRecord(record); setIsHistoryDetailOpen(true); };

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
        let nextApp = toAgg(app);

        if (!prevUserRating) {
          nextApp._agg.successCount += isSuccess ? 1 : 0;
          nextApp.totalVotes += 1;
          nextApp._agg.ratingSums.effectiveness += userRatingsInput.effectiveness;
          nextApp._agg.ratingSums.fun += userRatingsInput.fun;
          nextApp._agg.ratingSums.ease += userRatingsInput.ease;
          nextApp._agg.ratingSums.continuity += userRatingsInput.continuity;
          nextApp._agg.ratingSums.design += userRatingsInput.design;
        } else {
          nextApp._agg.successCount += (isSuccess ? 1 : 0) - (prevUserRating.isSuccess ? 1 : 0);
          nextApp._agg.ratingSums.effectiveness += userRatingsInput.effectiveness - prevUserRating.ratings.effectiveness;
          nextApp._agg.ratingSums.fun += userRatingsInput.fun - prevUserRating.ratings.fun;
          nextApp._agg.ratingSums.ease += userRatingsInput.ease - prevUserRating.ratings.ease;
          nextApp._agg.ratingSums.continuity += userRatingsInput.continuity - prevUserRating.ratings.continuity;
          nextApp._agg.ratingSums.design += userRatingsInput.design - prevUserRating.ratings.design;
        }

        nextApp._agg.successCount = Math.min(nextApp.totalVotes, Math.max(0, nextApp._agg.successCount));
        nextApp._agg.ratingSums.effectiveness = Math.max(0, nextApp._agg.ratingSums.effectiveness);
        nextApp._agg.ratingSums.fun = Math.max(0, nextApp._agg.ratingSums.fun);
        nextApp._agg.ratingSums.ease = Math.max(0, nextApp._agg.ratingSums.ease);
        nextApp._agg.ratingSums.continuity = Math.max(0, nextApp._agg.ratingSums.continuity);
        nextApp._agg.ratingSums.design = Math.max(0, nextApp._agg.ratingSums.design);

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
        let nextApp = toAgg(app);

        nextApp.totalVotes = Math.max(0, nextApp.totalVotes - 1);
        nextApp._agg.successCount -= prevUserRating.isSuccess ? 1 : 0;
        nextApp._agg.ratingSums.effectiveness -= prevUserRating.ratings.effectiveness;
        nextApp._agg.ratingSums.fun -= prevUserRating.ratings.fun;
        nextApp._agg.ratingSums.ease -= prevUserRating.ratings.ease;
        nextApp._agg.ratingSums.continuity -= prevUserRating.ratings.continuity;
        nextApp._agg.ratingSums.design -= prevUserRating.ratings.design;

        nextApp._agg.successCount = Math.min(nextApp.totalVotes, Math.max(0, nextApp._agg.successCount));
        nextApp._agg.ratingSums.effectiveness = Math.max(0, nextApp._agg.ratingSums.effectiveness);
        nextApp._agg.ratingSums.fun = Math.max(0, nextApp._agg.ratingSums.fun);
        nextApp._agg.ratingSums.ease = Math.max(0, nextApp._agg.ratingSums.ease);
        nextApp._agg.ratingSums.continuity = Math.max(0, nextApp._agg.ratingSums.continuity);
        nextApp._agg.ratingSums.design = Math.max(0, nextApp._agg.ratingSums.design);

        return recomputeAveragesPure(nextApp);
      })
    );

    const { [appId]: _, ...rest } = userRatings;
    setUserRatings(rest);
    alert("あなたの評価を削除しました。グラフを更新しました。");
  };

  const renderContent = () => {
    const historyListTotal = testHistory.length;
    const historyListTotalPages = Math.max(1, Math.ceil(historyListTotal / HISTORY_LIST_PAGE_SIZE));
    // すべて表示時はページング（20件/ページ）
    const displayHistory = historyFilter === "10"
      ? testHistory.slice(0, 10)
      : testHistory.slice((historyListPage - 1) * HISTORY_LIST_PAGE_SIZE, historyListPage * HISTORY_LIST_PAGE_SIZE);


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
                  <button onClick={() => { setHistoryFilter("10"); setHistoryListPage(1); }} className={`px-3 py-1 rounded-md text-xs font-bold transition ${historyFilter === "10" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>最新10件</button>
                  <button onClick={() => { setHistoryFilter("all"); setHistoryListPage(1); }} className={`px-3 py-1 rounded-md text-xs font-bold transition ${historyFilter === "all" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>すべて</button>
                </div>
              </div>

              {displayHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">まだ履歴がありません。<br/>ログインすると診断後に履歴が保存されます。</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayHistory.map((record: TestHistoryRecord) => (
                    <div
                      key={record.id}
                      onClick={() => openHistoryDetail(record)}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm cursor-pointer hover:bg-indigo-50 transition border-l-4 hover:border-l-indigo-500 group"
                    >
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

                  {historyFilter === "all" && historyListTotal > 0 && (
                    <div className="flex items-center justify-center gap-2 pt-3">
                      <button
                        onClick={() => setHistoryListPage((p) => Math.max(1, p - 1))}
                        disabled={historyListPage <= 1}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition border ${historyListPage <= 1 ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}>
                        ←
                      </button>
                      <span className="text-xs font-bold text-gray-600">{historyListPage} / {historyListTotalPages}</span>
                      <button
                        onClick={() => setHistoryListPage((p) => Math.min(historyListTotalPages, p + 1))}
                        disabled={historyListPage >= historyListTotalPages}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition border ${historyListPage >= historyListTotalPages ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}>
                        →
                      </button>
                    </div>
                  )}

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
        return (
          <PersonalizeSection
            currentUser={currentUser}
            appStats={appStats}
            chartjsConstructor={chartjsConstructor}
            isChartJsLoaded={isChartJsLoaded}
            onOpenSurvey={openSurvey}
          />
        );

      case "resources":
        return (
          <div className="max-w-4xl mx-auto relative">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 flex items-center"><span className="mr-2">📚</span> お役立ちリソース & ユーザー評価</h2>
            <ResourceSection appStats={appStats} chartjsConstructor={chartjsConstructor} isChartJsLoaded={isChartJsLoaded} onOpenSurvey={openSurvey} />
          </div>
        );

      case "hobby":
        return <HobbySection currentUser={currentUser} onGoPersonalize={() => setActiveTab("personalize")} />;

      case "knowledge":
        return (
          <div className="max-w-4xl mx-auto relative">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 flex items-center"><span className="mr-2">🦉</span> 脳科学・知識・相談</h2>
            <KnowledgeSection />
          </div>
        );

      case "board":
        return (
          <div className="max-w-4xl mx-auto relative">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 flex items-center"><span className="mr-2">💬</span> 掲示板</h2>
            <BoardSection currentUser={currentUser} onRequireLogin={onOpenAuth} />
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
        <div className="max-w-5xl mx-auto flex items-center justify-around">
          {[
            { id: "diagnosis", label: "依存度", icon: "🩺" },
            { id: "personalize", label: "タイプ", icon: "🔍" },
            { id: "resources", label: "アプリ", icon: "📚" },
            { id: "hobby", label: "趣味", icon: "🧶" },
            { id: "knowledge", label: "知識", icon: "🦉" },
                      { id: "board", label: "掲示板", icon: "💬" },
].map((tab) => (
            <button
              key={tab.id as any}
              onClick={() => { setActiveTab(tab.id as any); setIsHobbyFooterOpen(false); }}
              className={`flex flex-col items-center justify-center w-full py-3 transition ${activeTab === tab.id ? "text-indigo-600 bg-indigo-50" : "text-gray-500 hover:text-gray-800"}`}
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
isLoggedIn={!!currentUser}
        onLoginForHistory={onOpenAuth}
        chartjsConstructor={chartjsConstructor}
        isChartJsLoaded={isChartJsLoaded}
        testHistory={testHistory}
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
 9. 管理者画面（admin / admin）
=============================================== */
const AdminPanel = ({
  users, onClose, onDeleteUserDeep, onResetAllRatings, onClearAllUserData, onResetBoardData,
  appStats, onApplyDemoStats, onRestoreFromBackup,
}: {
  users: User[];
  onClose: () => void;
  onDeleteUserDeep: (userId: string) => void;
  onResetAllRatings: () => void;
  onClearAllUserData: () => void;
  onResetBoardData: () => void;
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
            <button onClick={openRatingsDemo} className="px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-lg font-bold">評価データのデモ・初期化</button>
            <button onClick={openUserDataDemo} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold">全ユーザーの診断履歴・結果・タイプ削除</button>
            <button
              onClick={() => {
                const ok = confirm(
                  "掲示板データを初期化します。\n\n" +
                  "削除対象：\n" +
                  "・スレッド一覧\n" +
                  "・投稿一覧\n" +
                  "・ユーザー別掲示板プロフィール\n\n" +
                  "この操作は元に戻せません。実行しますか？"
                );
                if (ok) onResetBoardData();
              }}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold"
            >
              掲示板データ初期化
            </button>
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
        onExecute={() => { if (demoMode === "ratings") { onResetAllRatings(); } else { onClearAllUserData(); } setIsDemoOpen(false); }}
        onApplyDemo={() => { onApplyDemoStats(); alert("デモデータを適用しました。画面上のグラフやカードで見え方を確認できます。"); }}
        onRestore={() => { onResetAllRatings(); }}
      />
    </div>
  );
};

/* ===============================================
 10. ルートコンポーネント
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

  const [activeTab, setActiveTab] = useState<"diagnosis" | "personalize" | "resources" | "hobby" | "knowledge" | "board">("diagnosis");
  const [isHobbyFooterOpen, setIsHobbyFooterOpen] = useState(false); // 互換のため残置

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

  useEffect(() => {
    if (isAppLoading) return;
    if (currentUser) return;
    const lastId = loadFromLocalStorage<string | null>(KEY_LAST_USER_ID, null);
    if (!lastId) return;
    const u = users.find(x => x.id === lastId);
    if (u) setCurrentUser(u);
  }, [isAppLoading, currentUser, users]);

  useEffect(() => { saveToLocalStorage(KEY_ACTIVE_TAB, activeTab); }, [activeTab]);
  useEffect(() => { saveToLocalStorage(KEY_USERS, users); }, [users]);
  useEffect(() => { saveToLocalStorage(KEY_APP_STATS, appStats); }, [appStats]);

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
    requestAnimationFrame(() => { setTimeout(() => { window.scrollTo(0, 0); }, 0); });
  }, [activeTab]);

  useEffect(() => {
    if (isAppLoading) return;
    const savedY = loadFromLocalStorage<number>(getScrollKey(activeTab), 0);
    requestAnimationFrame(() => { setTimeout(() => { window.scrollTo(0, savedY); }, 0); });
  }, [isAppLoading]);

  const resetAllTabScrollPositions = () => {
    (["diagnosis", "personalize", "resources", "hobby", "knowledge"] as const).forEach(tab =>
      saveToLocalStorage(getScrollKey(tab), 0)
    );
  };

  const handleRegister = (username: string, password: string, icon: string): boolean => {
    const dup = users.some(u => u.name === username);
    if (dup) { alert("そのユーザー名は既に使用されています。別の名前を入力してください。"); return false; }

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
    setIsHobbyFooterOpen(false);
    removeFromLocalStorage(KEY_LAST_USER_ID);
    resetAllTabScrollPositions();
    requestAnimationFrame(() => { setTimeout(() => window.scrollTo(0, 0), 0); });
  };

  const updateCurrentUser = (nextName: string, nextPassword: string, nextIcon: string) => {
    if (!currentUser) return;
    const nextUsers = users.map(u => u.id === currentUser.id ? { ...u, name: nextName, password: nextPassword, icon: nextIcon } : u);
    setUsers(nextUsers);
    saveToLocalStorage(KEY_USERS, nextUsers);
    setCurrentUser(prev => prev ? { ...prev, name: nextName, password: nextPassword, icon: nextIcon } : prev);
  };

  const onDeleteUserDeep = (userId: string) => {
    const nextUsers = users.filter(u => u.id !== userId);
    setUsers(nextUsers);
    saveToLocalStorage(KEY_USERS, nextUsers);

    const lastId = loadFromLocalStorage<string | null>(KEY_LAST_USER_ID, null);
    if (lastId === userId) { removeFromLocalStorage(KEY_LAST_USER_ID); }

    if (currentUser && currentUser.id === userId) {
      setCurrentUser(null);
      setActiveTab("diagnosis");
      setIsHobbyFooterOpen(false);
    }

    [KEY_ANSWERS, KEY_SCORE, KEY_RESULT, KEY_HISTORY, KEY_TYPE_RESULT, KEY_ACTIVE_TAB, KEY_USER_RATINGS].forEach((k) =>
      removeFromLocalStorage(k, userId)
    );
  };

  const handleDeleteOwnAccount = () => {
    if (!currentUser) return;
    const userId = currentUser.id;
    onDeleteUserDeep(userId);
    setCurrentUser(null);
    setIsAdminMode(false);
    setActiveTab("diagnosis");
    setIsHobbyFooterOpen(false);
    removeFromLocalStorage(KEY_LAST_USER_ID);
    resetAllTabScrollPositions();
    requestAnimationFrame(() => { setTimeout(() => window.scrollTo(0, 0), 0); });
  };

  const onResetAllRatings = () => {
    const emptyStats = initialAppStats.map((app) => ({
      ...app,
      successRate: 0,
      totalVotes: 0,
      ratings: { effectiveness: 0, fun: 0, ease: 0, continuity: 0, design: 0 },
      _agg: { successCount: 0, ratingSums: { effectiveness: 0, fun: 0, ease: 0, continuity: 0, design: 0 } },
    }));
    setAppStats(emptyStats);
    users.forEach((u: User) => { removeFromLocalStorage(KEY_USER_RATINGS, u.id); });
    saveToLocalStorage(KEY_APP_STATS, emptyStats);
    alert("評価データを0件に初期化しました。");
  };

  const onClearAllUserData = () => {
    users.forEach((u: User) => {
      [KEY_ANSWERS, KEY_SCORE, KEY_RESULT, KEY_HISTORY, KEY_TYPE_RESULT, KEY_ACTIVE_TAB].forEach((k) =>
        removeFromLocalStorage(k, u.id)
      );
    });
    alert("全ユーザーの診断関連データを削除しました。");
  };

  const onResetBoardData = () => {
    // スレッド・投稿（全体キー）
    removeFromLocalStorage(KEY_BOARD_THREADS);
    removeFromLocalStorage(KEY_BOARD_POSTS);

    // 掲示板プロフィール（ユーザー別キー）
    users.forEach((u: User) => {
      removeFromLocalStorage(KEY_BOARD_PROFILE, u.id);
    });

    alert("掲示板データ（スレッド・投稿・プロフィール）を初期化しました。");
  };

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
    if (!backup) { alert("バックアップが見つかりません。デモ適用前の状態である可能性があります。"); return; }
    setAppStats(backup);
    saveToLocalStorage(KEY_APP_STATS, backup);
    removeFromLocalStorage(KEY_APP_STATS_BACKUP);
  };

  const allHobbies: HobbyWithType[] = React.useMemo(() => {
    const list: HobbyWithType[] = [];
    Object.values(ADDICTION_TYPES).forEach(t => {
      (t.recommendedHobbies ?? []).forEach(h => {
        list.push({ ...h, typeId: t.id, typeName: t.name, typeIcon: t.icon });
      });
    });
    return list;
  }, []);

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
        onResetBoardData={onResetBoardData}
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
        allHobbies={allHobbies}
        isHobbyFooterOpen={isHobbyFooterOpen}
        setIsHobbyFooterOpen={setIsHobbyFooterOpen}
      />

      <UnifiedAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onAdminLogin={() => setIsAdminMode(true)}
        onSuccess={() => { setActiveTab("diagnosis"); }}
      />

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
