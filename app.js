// app.js (高校生向けシンプル版)

import {
    calculateScore,
    determineMBTIType,
    FUNCTIONS,
    COGNITIVE_STACKS,
    mbtiDescriptions
} from './core.js';
import { questions as originalQuestions } from './data.js';

// ============================================
// セキュリティ: HTMLサニタイズ関数
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// 質問のシャッフル処理
// ============================================

function fisherYatesShuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function shuffleQuestionsWithConstraints(questions) {
    const maxAttempts = 1000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const shuffled = fisherYatesShuffle(questions);
        
        let hasConsecutive = false;
        for (let i = 1; i < shuffled.length; i++) {
            if (shuffled[i].type === shuffled[i - 1].type) {
                hasConsecutive = true;
                break;
            }
        }
        
        if (!hasConsecutive) {
            return shuffled;
        }
    }
    
    console.warn('制約付きシャッフルが1000回で完了しませんでした。通常のシャッフル結果を使用します。');
    return fisherYatesShuffle(questions);
}

const questions = shuffleQuestionsWithConstraints(originalQuestions);

// ============================================
// 初期状態定義
// ============================================

const createDefaultState = () => ({
    currentQuestion: 0,
    answers: {},
    functionScores: {
        Ni: 0, Ne: 0, Si: 0, Se: 0,
        Ti: 0, Te: 0, Fi: 0, Fe: 0
    },
    showResult: false
});

let state = createDefaultState();
let isProcessing = false;
let hasSeenShadowExplanation = false;
let hasShownWeightingExplanation = false;

// ============================================
// 定数定義
// ============================================

const SCORE_LABELS = {
    1: "全くそう思わない",
    2: "あまりそう思わない",
    3: "どちらともいえない",
    4: "ややそう思う",
    5: "とてもそう思う"
};

const SCORE_MIN = -20;
const SCORE_MAX = 20;
const MIN_ANSWERS_FOR_PROVISIONAL = 8;

const ANIMATION_DELAY = {
    BUTTON_FEEDBACK: 200,
    SCREEN_TRANSITION: 300,
    POPUP_FADE_START: 50,
    POPUP_REMOVE: 1200,
    RESULT_STAGGER: 100
};

function normalizeScore(rawScore) {
    return Math.max(0, Math.min(100, 
        Math.round(((rawScore - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100)
    ));
}

// ============================================
// イベントハンドラ
// ============================================

/**
 * 回答処理(完全一致版)
 */
window.handleAnswer = function (value, event) {
    if (isProcessing) return;
    isProcessing = true;

    const question = questions[state.currentQuestion];
    const funcType = question.type;
    const isReverse = question.reverse || false;
    const oldAnswer = state.answers[question.id];

    // 前回の回答スコアを差し引く
    if (oldAnswer !== undefined) {
        const oldAnswerData = state.answers[question.id];
        const oldScore = calculateScore(
            typeof oldAnswerData === 'object' ? oldAnswerData.value : oldAnswerData, 
            isReverse
        );
        state.functionScores[funcType] -= oldScore;
    }

    // 🆕 変更前の正規化スコアを保存
    const oldNormalizedScore = normalizeScore(state.functionScores[funcType]);

    // 新しいスコアを加算
    const delta = calculateScore(value, isReverse);
    state.functionScores[funcType] += delta;
    
    // 🆕 変更後の正規化スコアを取得
    const newNormalizedScore = normalizeScore(state.functionScores[funcType]);
    const normalizedDelta = newNormalizedScore - oldNormalizedScore;

    // 回答を保存
    state.answers[question.id] = {
        value: value,
        isReverse: isReverse
    };

    // 🆕 ポップアップに「実際の表示変動値」を渡す
    showScorePopup(funcType, delta, normalizedDelta, isReverse);

    // ボタンの選択状態を更新
    if (event && event.currentTarget) {
        const buttons = document.querySelectorAll('.option');
        buttons.forEach(btn => {
            btn.classList.remove('selected');
            btn.disabled = true;
        });
        event.currentTarget.classList.add('selected');
    }

    // 次の質問へ
    if (state.currentQuestion < questions.length - 1) {
        setTimeout(() => {
            nextStep(() => state.currentQuestion++);
        }, ANIMATION_DELAY.BUTTON_FEEDBACK);
    } else {
        setTimeout(() => {
            nextStep(() => state.showResult = true);
        }, ANIMATION_DELAY.BUTTON_FEEDBACK);
    }
};

window.goBack = function () {
    if (state.currentQuestion > 0 && !isProcessing) {
        state.currentQuestion--;
        render();
    }
};

window.reset = function () {
    state = createDefaultState();
    hasSeenShadowExplanation = false;
    hasShownWeightingExplanation = false;
    render();
};

window.handleKeyboardNavigation = function (event, currentValue) {
    const options = Array.from(document.querySelectorAll('.option'));
    const currentIndex = options.findIndex(btn => parseInt(btn.dataset.value) === currentValue);
    
    let nextIndex = currentIndex;
    
    switch(event.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
            event.preventDefault();
            nextIndex = Math.max(0, currentIndex - 1);
            break;
        case 'ArrowDown':
        case 'ArrowRight':
            event.preventDefault();
            nextIndex = Math.min(options.length - 1, currentIndex + 1);
            break;
        case 'Enter':
        case ' ':
            event.preventDefault();
            handleAnswer(currentValue, event);
            return;
        case 'Home':
            event.preventDefault();
            nextIndex = 0;
            break;
        case 'End':
            event.preventDefault();
            nextIndex = options.length - 1;
            break;
        default:
            return;
    }
    
    if (nextIndex !== currentIndex && options[nextIndex]) {
        options[nextIndex].focus();
        options.forEach((opt, idx) => {
            opt.tabIndex = idx === nextIndex ? 0 : -1;
        });
    }
};

// 🆕 スコア詳細トグル
window.toggleScoreDetail = function(detailId) {
    const detail = document.getElementById(detailId);
    if (!detail) return;
    
    const isOpen = detail.style.maxHeight !== '0px' && detail.style.maxHeight !== '';
    
    // 全ての詳細を閉じる
    document.querySelectorAll('.score-detail').forEach(d => {
        if (d.id !== detailId) {
            d.style.maxHeight = '0px';
        }
    });
    
    // クリックされた詳細をトグル
    if (isOpen) {
        detail.style.maxHeight = '0px';
    } else {
        detail.style.maxHeight = detail.scrollHeight + 'px';
    }
};

// ============================================
// UI演出関数
// ============================================

/**
 * スコアポップアップ(高校生向けシンプル版)
 * 
 * @param {string} funcType - 認知機能タイプ
 * @param {number} delta - 生スコアの変動(内部計算用)
 * @param {number} normalizedDelta - 正規化スコア(0-100)の変動(表示用)
 * @param {boolean} isReverse - 逆転項目かどうか
 */
function showScorePopup(funcType, delta, normalizedDelta, isReverse) {
    const el = document.createElement("div");
    el.className = "score-popup";
    
    // 暫定タイプ取得
    const provisionalResult = determineMBTIType(state.functionScores, COGNITIVE_STACKS);
    const provisionalType = provisionalResult.type;
    const stack = COGNITIVE_STACKS[provisionalType];
    const position = stack.indexOf(funcType);
    
    let weight = 0;
    let positionLabel = '';
    let isShadow = false;
    
    if (position !== -1) {
        const weightMap = [4.0, 2.0, 1.0, 0.5];
        weight = weightMap[position];
        positionLabel = ['主', '補', '第三', '劣'][position];
    } else {
        positionLabel = 'shadow';
        isShadow = true;
    }
    
    const sign = normalizedDelta >= 0 ? '+' : '';
    const reverseIndicator = isReverse ? ' <span style="color:#f59e0b;font-size:11px;font-weight:600;">R</span>' : '';
    
    if (isShadow) {
        // Shadow機能: シンプル表示
        el.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
                <div style="font-weight:700;font-size:15px;">
                    ${FUNCTIONS[funcType].name}
                    <span style="font-size:11px;opacity:0.6;margin-left:4px;">[shadow]</span>
                </div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:800;color:#94a3b8;">
                    ${sign}${normalizedDelta}${reverseIndicator}
                </div>
            </div>
        `;
        el.setAttribute('data-shadow', 'true');
        
        // Shadow機能の説明(初回のみ)
        if (!hasSeenShadowExplanation) {
            hasSeenShadowExplanation = true;
            setTimeout(() => showShadowExplanation(), 1500);
        }
    } else {
        // スタック内機能: メイン表示 + ホバーで詳細
        const weightedDelta = delta * weight;
        const weightedSign = weightedDelta >= 0 ? '+' : '';
        
        el.innerHTML = `
            <div style="position:relative;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
                    <div style="font-weight:700;font-size:15px;">
                        ${FUNCTIONS[funcType].name}
                        <span style="font-size:11px;opacity:0.6;margin-left:4px;">[${positionLabel}]</span>
                    </div>
                    <div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:800;color:#60a5fa;">
                        ${sign}${normalizedDelta}${reverseIndicator}
                    </div>
                </div>
                
                <!-- 詳細情報(ホバー/タップで表示) -->
                <div class="popup-detail" style="
                    position:absolute;
                    top:calc(100% + 8px);
                    left:50%;
                    transform:translateX(-50%);
                    background:rgba(15,23,42,0.98);
                    padding:10px 14px;
                    border-radius:8px;
                    font-size:11px;
                    white-space:nowrap;
                    opacity:0;
                    pointer-events:none;
                    transition:opacity 0.2s ease;
                    z-index:10;
                    box-shadow:0 4px 12px rgba(0,0,0,0.3);
                    border:1px solid rgba(148,163,184,0.2);
                ">
                    <div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(148,163,184,0.2);">
                        <span style="opacity:0.7;">診断影響:</span>
                        <span style="color:#fbbf24;font-weight:700;margin-left:6px;">${weightedSign}${weightedDelta.toFixed(1)}</span>
                        <span style="opacity:0.5;margin-left:4px;">(×${weight})</span>
                    </div>
                    <div>
                        <span style="opacity:0.7;">生スコア:</span>
                        <span style="color:#94a3b8;font-weight:700;margin-left:6px;">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}</span>
                    </div>
                </div>
            </div>
        `;
        
        // ホバー/タップで詳細表示
        let detailTimeout;
        const detail = el.querySelector('.popup-detail');
        
        // PCでホバー
        el.addEventListener('mouseenter', () => {
            clearTimeout(detailTimeout);
            detailTimeout = setTimeout(() => {
                if (detail) {
                    detail.style.opacity = '1';
                    detail.style.pointerEvents = 'auto';
                }
            }, 300); // 0.3秒後に表示
        });
        
        el.addEventListener('mouseleave', () => {
            clearTimeout(detailTimeout);
            if (detail) {
                detail.style.opacity = '0';
                detail.style.pointerEvents = 'none';
            }
        });
        
        // スマホでタップ
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (detail) {
                const isVisible = detail.style.opacity === '1';
                detail.style.opacity = isVisible ? '0' : '1';
                detail.style.pointerEvents = isVisible ? 'none' : 'auto';
                
                // 3秒後に自動で閉じる
                if (!isVisible) {
                    setTimeout(() => {
                        detail.style.opacity = '0';
                        detail.style.pointerEvents = 'none';
                    }, 3000);
                }
            }
        });
    }
    
    document.body.appendChild(el);

    // ランダム位置
    const x = window.innerWidth / 2 + (Math.random() * 100 - 50);
    const y = window.innerHeight / 2 + (Math.random() * 50 - 25);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    // フェードアウト
    setTimeout(() => el.classList.add("fade-out"), ANIMATION_DELAY.POPUP_FADE_START);
    setTimeout(() => el.remove(), ANIMATION_DELAY.POPUP_REMOVE);
}

/**
 * Shadow機能の説明ツールチップ
 */
function showShadowExplanation() {
    const tooltip = document.createElement('div');
    tooltip.className = 'shadow-explanation';
    tooltip.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 8px;">💡 Shadow機能とは？</div>
        <div style="font-size: 13px; line-height: 1.5; opacity: 0.9;">
            暫定タイプのスタックに含まれない機能です。<br>
            スコアは表示されますが、<strong>タイプ診断には影響しません。</strong>
        </div>
    `;
    
    document.body.appendChild(tooltip);
    
    tooltip.style.position = 'fixed';
    tooltip.style.bottom = '80px';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%)';
    tooltip.style.background = 'rgba(30, 41, 59, 0.95)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '16px 20px';
    tooltip.style.borderRadius = '12px';
    tooltip.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
    tooltip.style.maxWidth = '400px';
    tooltip.style.zIndex = '10000';
    tooltip.style.textAlign = 'center';
    tooltip.style.animation = 'fadeIn 0.3s ease-out';
    
    setTimeout(() => {
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => tooltip.remove(), 300);
    }, 5000);
}

/**
 * 重み付けモードの説明(8問目)
 */
function showWeightingExplanation() {
    const tooltip = document.createElement('div');
    tooltip.className = 'weighting-explanation';
    tooltip.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 12px; font-size: 15px;">🎯 8問のデータが揃いました</div>
        <div style="font-size: 13px; line-height: 1.7; opacity: 0.95;">
            暫定タイプの信頼性が高まります。<br><br>
            
            <div style="background:rgba(96,165,250,0.15);padding:10px;border-radius:8px;margin-bottom:10px;">
                <strong style="color:#60a5fa;">ポップアップの数字</strong><br>
                画面のスコア変動と一致します
            </div>
            
            <div style="font-size:12px;opacity:0.8;line-height:1.6;">
                💡 ポップアップにマウスを乗せると<br>
                詳しい内訳が見られます
            </div>
        </div>
    `;
    
    document.body.appendChild(tooltip);
    
    tooltip.style.position = 'fixed';
    tooltip.style.bottom = '80px';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%)';
    tooltip.style.background = 'rgba(30, 41, 59, 0.96)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '20px 24px';
    tooltip.style.borderRadius = '12px';
    tooltip.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
    tooltip.style.maxWidth = '480px';
    tooltip.style.zIndex = '10000';
    tooltip.style.textAlign = 'left';
    tooltip.style.animation = 'fadeIn 0.3s ease-out';
    
    setTimeout(() => {
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => tooltip.remove(), 300);
    }, 8000);
}

function nextStep(callback) {
    setTimeout(() => {
        callback();
        render();
        isProcessing = false;
    }, ANIMATION_DELAY.SCREEN_TRANSITION);
}

// ============================================
// レンダリング関数
// ============================================

function render() {
    const container = document.getElementById('app');
    
    if (state.showResult) {
        renderResult(container);
    } else {
        renderQuestion(container);
        updateSidePanel();
        
        setTimeout(() => {
            const allOptions = document.querySelectorAll('.option');
            const currentQuestion = questions[state.currentQuestion];
            const savedAnswer = state.answers[currentQuestion?.id];
            allOptions.forEach(btn => {
                const btnValue = parseInt(btn.getAttribute('data-value'));
                const actualValue = savedAnswer ? savedAnswer.value : undefined;
                if (actualValue !== btnValue) {
                    btn.classList.remove('selected');
                }
            });
        }, 0);
    }
}

/**
 * サイドパネル更新(高校生向けシンプル版)
 */
function updateSidePanel() {
    const answeredCount = Object.keys(state.answers).length;
    const progressPercent = Math.round((state.currentQuestion / Math.max(1, questions.length - 1)) * 100);
    
    const sidePanel = document.querySelector('.summary');
    if (!sidePanel) return;
    
    // 正規化スコア
    const sortedScores = Object.entries(state.functionScores)
        .map(([key, val]) => ({
            key,
            rawValue: val,
            normalizedValue: normalizeScore(val)
        }))
        .sort((a, b) => b.normalizedValue - a.normalizedValue);
    
    // 回答数0
    if (answeredCount === 0) {
        sidePanel.innerHTML = `
            <div class="provisional-mbti">
                <div class="provisional-label">暫定診断</div>
                <div style="padding:32px 16px;text-align:center;">
                    <div style="font-size:48px;margin-bottom:12px;opacity:0.3;">❓</div>
                    <div style="font-size:14px;color:var(--text-muted);line-height:1.6;">
                        質問に回答すると<br>
                        暫定診断が表示されます
                    </div>
                </div>
                <div class="provisional-progress">${progressPercent}% complete</div>
            </div>
            
            <div class="character-preview">
                <div class="character-placeholder">
                    <div class="character-label">キャラクター画像</div>
                    <div class="character-note">友達が描いてくれる予定</div>
                </div>
            </div>
            
            <div class="score-list" id="scoreList">
                <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;text-align:center;">
                    スコア(0 〜 100、50が平均)
                </div>
                ${sortedScores.map(item => `
                    <div class="score-item">
                        <div style="font-weight:700;min-width:48px">${escapeHtml(item.key)}</div>
                        <div style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:800;background:linear-gradient(135deg,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${item.normalizedValue}</div>
                    </div>
                `).join('')}
            </div>
            
            <footer class="note">回答数: 0 / ${questions.length}</footer>
        `;
        return;
    }
    
    // 暫定診断
    const provisionalResult = determineMBTIType(state.functionScores, COGNITIVE_STACKS);
    const provisionalType = provisionalResult.type;
    const provisionalDesc = mbtiDescriptions[provisionalType];
    const stack = COGNITIVE_STACKS[provisionalType];
    
    // スタック位置を取得
    const stackPositions = {};
    stack.forEach((func, index) => {
        stackPositions[func] = {
            position: index,
            label: ['主', '補', '第三', '劣'][index],
            weight: [4.0, 2.0, 1.0, 0.5][index]
        };
    });
    
    // 重み付けスコアを計算
    const scoresWithWeights = sortedScores.map(item => {
        const stackInfo = stackPositions[item.key];
        const weightedValue = stackInfo 
            ? item.rawValue * stackInfo.weight 
            : 0;
        
        return {
            ...item,
            stackInfo,
            weightedValue
        };
    });
    
    const reliabilityWarning = answeredCount < MIN_ANSWERS_FOR_PROVISIONAL
        ? '<div style="font-size:11px;color:#fbbf24;margin-top:4px;">⚠ 回答数が少ないため精度が低い可能性があります</div>'
        : '';
    
    sidePanel.innerHTML = `
        <div class="provisional-mbti">
            <div class="provisional-label">暫定診断</div>
            <div class="provisional-type">${escapeHtml(provisionalType)}</div>
            <div class="provisional-name">${escapeHtml(provisionalDesc.name)}</div>
            ${reliabilityWarning}
            <div class="provisional-progress">${progressPercent}% complete</div>
        </div>
        
        <div class="character-preview">
            <div class="character-placeholder">
                <div class="character-label">キャラクター画像</div>
                <div class="character-note">友達が描いてくれる予定</div>
            </div>
        </div>
        
        <div class="score-list" id="scoreList">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;text-align:center;">
                スコア(0 〜 100、50が平均)
            </div>
            
            ${scoresWithWeights.map((item, index) => {
                const isInStack = item.stackInfo !== undefined;
                const positionLabel = isInStack ? item.stackInfo.label : 'shadow';
                const detailId = `score-detail-${index}`;
                
                return `
                    <div class="score-item-simple" style="
                        background: ${isInStack ? 'var(--bg-secondary)' : 'transparent'};
                        padding: 10px 14px;
                        border-radius: 8px;
                        margin-bottom: 6px;
                        border: 1px solid ${isInStack ? 'rgba(96,165,250,0.2)' : 'rgba(148,163,184,0.1)'};
                        cursor: ${isInStack ? 'pointer' : 'default'};
                        transition: all 0.2s;
                        user-select: none;
                    " ${isInStack ? `onclick="toggleScoreDetail('${detailId}')"` : ''}>
                        <div style="display:flex;align-items:center;justify-content:space-between;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-weight:700;font-size:15px;">${escapeHtml(item.key)}</span>
                                <span style="font-size:10px;opacity:0.5;font-weight:500;">[${positionLabel}]</span>
                                ${isInStack ? '<span style="font-size:10px;opacity:0.4;">▼</span>' : ''}
                            </div>
                            <div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:800;color:#60a5fa;">
                                ${item.normalizedValue}
                            </div>
                        </div>
                        
                        ${isInStack ? `
                            <div id="${detailId}" class="score-detail" style="
                                max-height: 0;
                                overflow: hidden;
                                transition: max-height 0.3s ease;
                                margin-top: 0;
                            ">
                                <div style="padding-top:8px;margin-top:8px;border-top:1px solid rgba(148,163,184,0.2);">
                                    <div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.7;margin-bottom:4px;">
                                        <span>診断影響 (×${item.stackInfo.weight})</span>
                                        <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:#fbbf24;">
                                            ${item.weightedValue.toFixed(1)}
                                        </span>
                                    </div>
                                    <div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.7;">
                                        <span>生スコア</span>
                                        <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:#94a3b8;">
                                            ${item.rawValue.toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ` : `
                            <div style="font-size:10px;opacity:0.4;text-align:center;margin-top:4px;">
                                診断に影響なし
                            </div>
                        `}
                    </div>
                `;
            }).join('')}
        </div>
        
        <footer class="note">
            💡 各スコアをタップ/クリックすると詳細が見られます
        </footer>
    `;
    
    // 8問目の説明
    if (answeredCount === MIN_ANSWERS_FOR_PROVISIONAL && !hasShownWeightingExplanation) {
        hasShownWeightingExplanation = true;
        setTimeout(() => {
            showWeightingExplanation();
        }, 500);
    }
}

/**
 * 質問画面の描画
 */
function renderQuestion(container) {
    const q = questions[state.currentQuestion];
    const savedAnswer = state.answers[q.id];
    const currentValue = savedAnswer ? savedAnswer.value : undefined;
    
    container.innerHTML = `
        <div class="question" role="form" aria-label="MBTI診断質問フォーム">
            <h3 id="question-number">Question ${state.currentQuestion + 1} of ${questions.length}</h3>
            <p id="question-text" role="heading" aria-level="2">${escapeHtml(q.text)}${q.reverse ? ' <span style="color:var(--accent);font-size:0.9em">(逆転項目)</span>' : ''}</p>
            
            <div class="options" role="radiogroup" aria-labelledby="question-text" aria-describedby="question-number">
                ${[1, 2, 3, 4, 5].map((v, index) => `
                    <button class="option ${currentValue === v ? 'selected' : ''}"
                            role="radio"
                            aria-checked="${currentValue === v ? 'true' : 'false'}"
                            aria-label="${escapeHtml(SCORE_LABELS[v])} (5段階評価の${v})"
                            data-value="${v}"
                            tabindex="${currentValue === v ? '0' : (currentValue === undefined && index === 0 ? '0' : '-1')}"
                            onclick="handleAnswer(${v}, event)"
                            onkeydown="handleKeyboardNavigation(event, ${v})">
                        ${escapeHtml(SCORE_LABELS[v])}
                    </button>
                `).join('')}
            </div>

            <div class="progress" role="progressbar" aria-valuenow="${progressPercent()}" aria-valuemin="0" aria-valuemax="100" aria-label="診断の進捗状況">
                <i style="width:${progressPercent()}%"></i>
            </div>

            <div class="status" role="region" aria-label="認知機能スコア">
                ${Object.entries(state.functionScores).map(([key, val]) => {
                    const displayValue = normalizeScore(val);
                    return `
                        <div class="func-card" role="status" aria-label="${escapeHtml(key)}機能: ${displayValue}ポイント">
                            <div class="func-label">${escapeHtml(key)}</div>
                            <div class="func-value">${displayValue}</div>
                            <div class="func-glow" style="opacity: ${displayValue / 100}" aria-hidden="true"></div>
                        </div>
                    `;
                }).join('')}
            </div>

            ${state.currentQuestion > 0 
                ? `<button class="back-btn" onclick="goBack()" aria-label="前の質問に戻る">← Back</button>` 
                : ''}
            
            <footer class="app-footer">
                © ${new Date().getFullYear()} Cognitive Function Analysis • For educational purposes
            </footer>
        </div>
    `;
    
    setTimeout(() => {
        const selectedOption = container.querySelector('.option[aria-checked="true"]');
        const firstOption = container.querySelector('.option');
        (selectedOption || firstOption)?.focus();
    }, 0);
}

/**
 * 進捗率計算
 */
function progressPercent() {
    if (questions.length <= 1) return 100;
    return Math.round((state.currentQuestion / (questions.length - 1)) * 100);
}

/**
 * 結果画面の描画
 */
function renderResult(container) {
    const result = determineMBTIType(state.functionScores, COGNITIVE_STACKS);
    const mbtiType = result.type;
    const confidence = result.confidence;
    const top2 = result.top2;
    const desc = mbtiDescriptions[mbtiType];
    const secondDesc = mbtiDescriptions[top2[1]];

    const confidenceMessage = confidence >= 30 
        ? '診断結果に高い信頼性があります'
        : '複数のタイプの特性を持っています。次点タイプも参考にしてください';

    const sortedScores = Object.entries(state.functionScores)
        .map(([key, val]) => ({
            key,
            value: normalizeScore(val),
            func: FUNCTIONS[key]
        }))
        .sort((a, b) => b.value - a.value);

    container.innerHTML = `
        <div class="result fade-in" role="article" aria-labelledby="result-title">
            <div class="result-header">
                <h2 id="result-title" class="result-title">Analysis Complete</h2>
                <p class="result-subtitle">Your cognitive profile has been identified</p>
            </div>

            <div class="result-main-card" role="region" aria-labelledby="mbti-type">
                <div id="mbti-type" class="mbti-badge" role="heading" aria-level="1">${escapeHtml(mbtiType)}</div>
                <h3 class="mbti-name">${escapeHtml(desc.name)}</h3>
                <p class="mbti-desc">${escapeHtml(desc.description)}</p>
                
                <div class="confidence-meter" role="region" aria-label="診断結果の信頼度">
                    <div class="confidence-label">
                        <span>Match Confidence</span>
                        <span class="confidence-value">${confidence}%</span>
                    </div>
                    <div class="confidence-bar-bg" role="progressbar" aria-valuenow="${confidence}" aria-valuemin="0" aria-valuemax="100">
                        <div class="confidence-bar-fill" style="width: ${confidence}%"></div>
                    </div>
                    <p class="confidence-message">${escapeHtml(confidenceMessage)}</p>
                </div>
            </div>

            ${confidence < 30 ? `
                <div class="secondary-type-card" role="complementary" aria-label="次点タイプ">
                    <h4>Alternative Type: ${escapeHtml(top2[1])}</h4>
                    <p class="secondary-name">${escapeHtml(secondDesc.name)}</p>
                    <p class="secondary-desc">${escapeHtml(secondDesc.description)}</p>
                </div>
            ` : ''}

            <div class="function-stack-card" role="region" aria-labelledby="stack-title">
                <h4 id="stack-title" class="stack-title">Cognitive Function Stack</h4>
                <div class="stack-grid">
                    ${COGNITIVE_STACKS[mbtiType].map((f, index) => `
                        <div class="stack-item" role="article">
                            <div class="stack-rank">${escapeHtml(['Primary', 'Auxiliary', 'Tertiary', 'Inferior'][index])}</div>
                            <div class="stack-func-name">${escapeHtml(FUNCTIONS[f].fullName)}</div>
                            <div class="stack-func-code">${escapeHtml(FUNCTIONS[f].name)}</div>
                            <div class="stack-func-desc">${escapeHtml(FUNCTIONS[f].description)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="scores-breakdown" role="region" aria-labelledby="breakdown-title">
                <h4 id="breakdown-title" class="breakdown-title">Detailed Function Scores</h4>
                <div class="scores-grid">
                    ${sortedScores.map(item => `
                        <div class="score-card" role="article" aria-label="${escapeHtml(item.func.fullName)}: ${item.value}ポイント">
                            <div class="score-header">
                                <span class="score-func-code">${escapeHtml(item.key)}</span>
                                <span class="score-value">${item.value}</span>
                            </div>
                            <div class="score-func-name">${escapeHtml(item.func.fullName)}</div>
                            <div class="score-bar-mini" role="progressbar" aria-valuenow="${item.value}" aria-valuemin="0" aria-valuemax="100">
                                <div class="score-bar-mini-fill" style="width: ${item.value}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="result-actions">
                <button class="btn-restart" onclick="reset()" aria-label="診断を最初からやり直す">
                    <span>Take Assessment Again</span>
                    <span class="btn-icon" aria-hidden="true">↻</span>
                </button>
            </div>
            
            <footer class="app-footer">
                © ${new Date().getFullYear()} Cognitive Function Analysis • Based on Jungian theory
            </footer>
        </div>
    `;

    // 登場アニメーション
    setTimeout(() => {
        document.querySelectorAll('.result > *').forEach((el, index) => {
            setTimeout(() => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, 50);
            }, index * ANIMATION_DELAY.RESULT_STAGGER);
        });
    }, ANIMATION_DELAY.RESULT_STAGGER);
}

// ============================================
// 初期化
// ============================================

window.onload = render;