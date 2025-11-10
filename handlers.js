// ============================================
// handlers.js - Event Handlers
// ============================================

export function useHandlers(diagnosisState, questions, calculateScore, storage) {
    const { getState, setState } = diagnosisState;

    return {
        handleAnswer: (value, event) => {
            const state = getState();
            const question = questions[state.currentQuestion];
            const isReverse = question.reverse || false;

            // 回答を保存
            setState(prev => ({
                ...prev,
                answers: {
                    ...prev.answers,
                    [question.id]: { value, isReverse }
                }
            }));

            // スコアを更新
            const delta = calculateScore(value, isReverse);
            setState(prev => ({
                ...prev,
                functionScores: {
                    ...prev.functionScores,
                    [question.function]: prev.functionScores[question.function] + delta
                }
            }));

            // Shadow説明フラグを保存
            if (event?.currentTarget?.closest('.option-shadow')) {
                storage.shadowSeen.set();
            }

            // 最後の質問なら結果表示、そうでなければ次の質問へ
            setTimeout(() => {
                const currentState = getState();
                if (currentState.currentQuestion >= questions.length - 1) {
                    setState(prev => ({ ...prev, showResult: true }));
                } else {
                    setState(prev => ({
                        ...prev,
                        currentQuestion: prev.currentQuestion + 1
                    }));
                }
            }, 100);
        },

        goBack: () => {
            const state = getState();
            if (state.currentQuestion > 0) {
                setState(prev => ({
                    ...prev,
                    currentQuestion: prev.currentQuestion - 1
                }));
            }
        },

        goNext: () => {
            const state = getState();
            const question = questions[state.currentQuestion];
            
            if (state.answers[question.id] && state.currentQuestion < questions.length - 1) {
                setState(prev => ({
                    ...prev,
                    currentQuestion: prev.currentQuestion + 1
                }));
            }
        },

        reset: () => {
            // アラート不要、即座にリセット
            storage.clearAll();
            
            // 初期状態に戻す
            setState({
                currentQuestion: 0,
                answers: {},
                functionScores: {
                    Ni: 0, Ne: 0, Si: 0, Se: 0,
                    Ti: 0, Te: 0, Fi: 0, Fe: 0
                },
                showResult: false
            });

            // 結果画面から質問画面に戻る
            const questionScreen = document.getElementById('question-screen');
            const resultScreen = document.getElementById('result-screen');
            
            if (questionScreen && resultScreen) {
                questionScreen.style.display = 'block';
                resultScreen.style.display = 'none';
            }

            // ページトップにスクロール
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        handleKeyboardNav: (event, currentValue) => {
            const state = getState();
            const options = Array.from(document.querySelectorAll('.option'));
            const currentIndex = options.findIndex(opt => 
                parseInt(opt.dataset.value) === currentValue
            );

            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    if (currentIndex > 0) {
                        options[currentIndex - 1].focus();
                    }
                    break;

                case 'ArrowRight':
                    event.preventDefault();
                    if (currentIndex < options.length - 1) {
                        options[currentIndex + 1].focus();
                    }
                    break;

                case 'Home':
                    event.preventDefault();
                    options[0].focus();
                    break;

                case 'End':
                    event.preventDefault();
                    options[options.length - 1].focus();
                    break;

                case 'Enter':
                case ' ':
                    event.preventDefault();
                    this.handleAnswer(currentValue, event);
                    break;

                default:
                    // 1-5のキーで直接選択
                    const num = parseInt(event.key);
                    if (num >= 1 && num <= 5) {
                        event.preventDefault();
                        this.handleAnswer(num, event);
                    }
                    break;
            }
        }
    };
}