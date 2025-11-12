// ============================================
// hooks.js - Custom Hooks (状態管理・3モード対応版)
// ============================================

/**
 * useState風の状態管理
 */
export function createState(initialState) {
    let state = initialState;
    const listeners = new Set();

    const setState = (newState) => {
        state = typeof newState === 'function' ? newState(state) : newState;
        listeners.forEach(listener => listener(state));
    };

    const getState = () => state;

    const subscribe = (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };

    return [getState, setState, subscribe];
}

/**
 * useDiagnosisState - 診断状態管理フック
 */
export function useDiagnosisState(questions) {
    const initialState = {
        currentQuestion: 0,
        answers: {},
        functionScores: {
            Ni: 0, Ne: 0, Si: 0, Se: 0,
            Ti: 0, Te: 0, Fi: 0, Fe: 0
        },
        showResult: false
    };

    const [getState, setState, subscribe] = createState(initialState);

    // Actions
    const actions = {
        setAnswer: (questionId, value, isReverse) => {
            setState(prev => ({
                ...prev,
                answers: {
                    ...prev.answers,
                    [questionId]: { value, isReverse }
                }
            }));
        },

        updateFunctionScore: (funcType, delta) => {
            setState(prev => ({
                ...prev,
                functionScores: {
                    ...prev.functionScores,
                    [funcType]: prev.functionScores[funcType] + delta
                }
            }));
        },

        nextQuestion: () => {
            setState(prev => ({
                ...prev,
                currentQuestion: Math.min(prev.currentQuestion + 1, questions.length - 1)
            }));
        },

        prevQuestion: () => {
            setState(prev => ({
                ...prev,
                currentQuestion: Math.max(prev.currentQuestion - 1, 0)
            }));
        },

        showResult: () => {
            setState(prev => ({ ...prev, showResult: true }));
        },

        reset: () => {
            setState(initialState);
        }
    };

    return { getState, setState, subscribe, actions };
}

/**
 * useLocalStorage - ローカルストレージフック (3モード対応)
 */
export function useLocalStorage(keyPrefix = 'persona_finder') {
    const keys = {
        STATE: `${keyPrefix}_state`,
        SHUFFLE_SEED: `${keyPrefix}_shuffle_seed`,
        HAS_SEEN_SHADOW: `${keyPrefix}_seen_shadow`,
        MODE: `${keyPrefix}_mode`
    };

    return {
        /**
         * 状態を保存
         * @param {Object} state - 診断状態
         * @returns {boolean} 成功したかどうか
         */
        saveState: (state) => {
            try {
                const serialized = JSON.stringify({
                    ...state,
                    timestamp: Date.now()
                });
                localStorage.setItem(keys.STATE, serialized);
                return true;
            } catch (error) {
                console.error('[Storage] 保存エラー:', error);
                return false;
            }
        },

        /**
         * 状態を読み込み
         * @returns {Object|null} 診断状態またはnull
         */
        loadState: () => {
            try {
                const serialized = localStorage.getItem(keys.STATE);
                if (!serialized) return null;

                const loaded = JSON.parse(serialized);
                const ONE_DAY = 24 * 60 * 60 * 1000;
                
                // 1日以上経過していたら削除
                if (Date.now() - loaded.timestamp > ONE_DAY) {
                    console.info('[Storage] 保存データが古いため削除');
                    localStorage.removeItem(keys.STATE);
                    return null;
                }

                return loaded;
            } catch (error) {
                console.error('[Storage] 復元エラー:', error);
                return null;
            }
        },

        /**
         * 全ストレージをクリア
         */
        clearAll: () => {
            Object.values(keys).forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    console.error(`[Storage] 削除エラー (${key}):`, error);
                }
            });
            console.info('[Storage] 全データをクリア');
        },

        /**
         * シャッフルシード管理
         */
        shuffleSeed: {
            get: () => {
                try {
                    const stored = localStorage.getItem(keys.SHUFFLE_SEED);
                    return stored ? parseInt(stored, 10) : Date.now();
                } catch (error) {
                    console.error('[Storage] シード取得エラー:', error);
                    return Date.now();
                }
            },
            set: (seed) => {
                try {
                    localStorage.setItem(keys.SHUFFLE_SEED, seed.toString());
                } catch (error) {
                    console.error('[Storage] シード保存エラー:', error);
                }
            }
        },

        /**
         * Shadow説明表示履歴
         */
        shadowSeen: {
            get: () => {
                try {
                    return localStorage.getItem(keys.HAS_SEEN_SHADOW) === 'true';
                } catch (error) {
                    console.error('[Storage] Shadow履歴取得エラー:', error);
                    return false;
                }
            },
            set: () => {
                try {
                    localStorage.setItem(keys.HAS_SEEN_SHADOW, 'true');
                } catch (error) {
                    console.error('[Storage] Shadow履歴保存エラー:', error);
                }
            }
        },

        /**
         * モードを取得
         * @returns {string} モードID ('simple' | 'standard' | 'detail')
         */
        getMode: () => {
            try {
                return localStorage.getItem(keys.MODE) || 'standard';
            } catch (error) {
                console.error('[Storage] モード取得エラー:', error);
                return 'standard';
            }
        },

        /**
         * モードを保存
         * @param {string} mode - モードID
         */
        setMode: (mode) => {
            try {
                localStorage.setItem(keys.MODE, mode);
                console.info(`[Storage] モード保存: ${mode}`);
            } catch (error) {
                console.error('[Storage] モード保存エラー:', error);
            }
        },

        /**
         * ストレージ使用状況を取得 (デバッグ用)
         * @returns {Object} 使用状況
         */
        getUsageInfo: () => {
            try {
                const usage = {};
                Object.entries(keys).forEach(([name, key]) => {
                    const item = localStorage.getItem(key);
                    usage[name] = {
                        exists: item !== null,
                        size: item ? new Blob([item]).size : 0
                    };
                });
                return usage;
            } catch (error) {
                console.error('[Storage] 使用状況取得エラー:', error);
                return {};
            }
        }
    };
}