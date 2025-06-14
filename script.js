// 调试控制台功能
const debugConsole = {
    init() {
        this.console = document.getElementById('debug-console');
        this.output = document.getElementById('debug-output');
        this.toggleBtn = document.getElementById('debug-toggle');
        this.isCollapsed = true;

        // 重写console方法
        this.overrideConsole();
        
        // 绑定事件
        this.toggleBtn.addEventListener('click', () => this.toggle());
    },

    toggle() {
        if (this.isCollapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    },

    collapse() {
        this.console.classList.add('collapsed');
        this.isCollapsed = true;
    },

    expand() {
        this.console.classList.remove('collapsed');
        this.isCollapsed = false;
    },

    log(message, type = 'log') {
        const div = document.createElement('div');
        div.className = type;
        div.textContent = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
        this.output.appendChild(div);
        this.output.scrollTop = this.output.scrollHeight;
    },

    overrideConsole() {
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };

        console.log = (...args) => {
            originalConsole.log.apply(console, args);
            this.log(args.join(' '), 'log');
        };

        console.error = (...args) => {
            originalConsole.error.apply(console, args);
            this.log(args.join(' '), 'error');
        };

        console.warn = (...args) => {
            originalConsole.warn.apply(console, args);
            this.log(args.join(' '), 'warn');
        };

        console.info = (...args) => {
            originalConsole.info.apply(console, args);
            this.log(args.join(' '), 'info');
        };
    }
};

// 初始化调试控制台
document.addEventListener('DOMContentLoaded', () => {
    debugConsole.init();

    const playerCountInput = document.getElementById('player-count');
    const playerCardsSetupDiv = document.getElementById('player-cards-setup');
    const startGameBtn = document.getElementById('start-game-btn');
    const playerSetupSection = document.getElementById('player-setup');
    const gameInProgressSection = document.getElementById('game-in-progress');
    const playerCardsGameDiv = document.getElementById('player-cards-game');
    const nextTurnBtn = document.getElementById('next-turn-btn'); // Maintained for potential future use or alternative control
    const pauseResumeBtn = document.getElementById('pause-resume-btn');
    const newGameInProgressBtn = document.getElementById('new-game-in-progress-btn');
    const confirmationModal = document.getElementById('confirmation-modal');
    const modalMessage = document.getElementById('modal-message');
    const confirmActionBtn = document.getElementById('confirm-action-btn');
    const cancelActionBtn = document.getElementById('cancel-action-btn');
    const drawerToggle = document.getElementById('drawer-toggle');
    const drawerContent = document.querySelector('.drawer-content');
    const orderAdjustmentModal = document.getElementById('order-adjustment-modal');
    const orderAdjustmentList = document.getElementById('order-adjustment-list');
    const confirmOrderBtn = document.getElementById('confirm-order-btn');
    const cancelOrderBtn = document.getElementById('cancel-order-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    let playerBgmMap = new Map(); // 存储每个玩家的BGM
    let currentBgmPosition = 0; // 当前BGM播放位置
    let audioQueue = []; // 音频播放队列
    let isPlayingQueue = false; // 是否正在播放队列

    let currentTimerMode = 1; // Default to mode 1
    const timerModeSettings = {
        1: { name: "模式一：正向计时", description: "从 0 开始累计每位玩家单次行动时间。" }
    }; // Made const as it's now fixed

    let players = [];
    let currentPlayerIndex = 0;
    let timerInterval = null;
    let gamePaused = false;
    let currentTurnStartTime = 0; // Timestamp for the start of the active player's current segment of time
    //每回合开始播放的音频
    const turnStartSound = new Audio('turn_start.mp3'); // 预加载回合开始音频

    const defaultPlayerNames = ["雷锋", "dulang", "开心"];
    const availableColors = ['#FF6B6B', '#45B7D1', '#4ECDC4', '#FED766', '#9B59B6', '#F3A683', '#FFC300', '#DAF7A6', '#C70039', '#900C3F'];
    const defaultPlayerConfigs = {
        "雷锋": { color: '#FF6B6B' },
        "dulang": { color: '#FED766' },
        "开心": { color: '#45B7D1' }
    };

    // --- Initialization and Settings --- 

    function initializeApp() {
        if (!loadSettings()) {
            playerCountInput.value = 3; // Default player count
            generatePlayersArray(parseInt(playerCountInput.value));
            // No timer mode settings to initialize beyond the fixed Mode 1
        }
        renderPlayerCardsSetup();

        playerSetupSection.classList.add('active-section');
        gameInProgressSection.classList.remove('active-section');
    }

    function generatePlayersArray(count) {
        players = [];
        for (let i = 0; i < count; i++) {
            const playerId = `player-${Date.now()}-${i}`;
            let defaultName = `玩家 ${i + 1}`;
            let defaultColor = availableColors[i % availableColors.length];

            if (i < defaultPlayerNames.length) {
                defaultName = defaultPlayerNames[i];
                if (defaultPlayerConfigs[defaultName]) {
                    defaultColor = defaultPlayerConfigs[defaultName].color;
                }
            }
            players.push({
                id: playerId,
                name: defaultName,
                color: defaultColor,
                time: 0, // Total accumulated time for this player in the current game
                order: i,
                passed: false // 添加passed属性
            });
        }
    }

    function saveSettings() {
        const settings = {
            playerCount: parseInt(playerCountInput.value),
            players: players.map(p => ({ id: p.id, name: p.name, color: p.color, order: p.order, time: 0 })),
            timerMode: 1 // Hardcode to mode 1
        };
        localStorage.setItem('chessClockSettings', JSON.stringify(settings));
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem('chessClockSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                playerCountInput.value = settings.playerCount || 3;
                if (settings.players && settings.players.length === parseInt(playerCountInput.value)) {
                    players = settings.players.map(p => ({
                        ...p,
                        time: 0 // Ensure time is reset when loading settings for a new game setup
                    }));
                    players.sort((a, b) => a.order - b.order);
                    currentTimerMode = 1; // Always mode 1
                    return true;
                }
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }
        return false;
    }

    // --- Player Setup UI --- 
    function renderPlayerCardsSetup() {
        playerCardsSetupDiv.innerHTML = '';
        players.forEach((player) => {
            const card = document.createElement('div');
            card.classList.add('player-card');
            card.style.backgroundColor = player.color;
            card.draggable = true;
            card.dataset.playerId = player.id;
            card.dataset.order = player.order;

            const topRow = document.createElement('div');
            topRow.classList.add('card-top-row');
            const orderIndicator = document.createElement('div');
            orderIndicator.classList.add('order-indicator');
            orderIndicator.textContent = player.order + 1;
            topRow.appendChild(orderIndicator);
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = player.name;
            nameInput.maxLength = 8;
            nameInput.classList.add('player-name-input');
            nameInput.addEventListener('change', (e) => {
                player.name = e.target.value;
                saveSettings();
            });
            topRow.appendChild(nameInput);
            card.appendChild(topRow);

            const timeDisplaySetup = document.createElement('div');
            timeDisplaySetup.classList.add('player-time-setup-placeholder');
            timeDisplaySetup.textContent = '00:00';
            card.appendChild(timeDisplaySetup);

            const bottomRow = document.createElement('div');
            bottomRow.classList.add('card-bottom-row');
            const quickActionsDiv = document.createElement('div');
            quickActionsDiv.classList.add('quick-actions');
            const moveToTopBtn = document.createElement('button');
            moveToTopBtn.classList.add('quick-sort-btn');
            moveToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
            moveToTopBtn.title = '移至首位';
            moveToTopBtn.addEventListener('click', (e) => { e.stopPropagation(); moveToPosition(player.id, 0); });
            const moveToBottomBtn = document.createElement('button');
            moveToBottomBtn.classList.add('quick-sort-btn');
            moveToBottomBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
            moveToBottomBtn.title = '移至末位';
            moveToBottomBtn.addEventListener('click', (e) => { e.stopPropagation(); moveToPosition(player.id, players.length - 1); });
            quickActionsDiv.appendChild(moveToTopBtn);
            quickActionsDiv.appendChild(moveToBottomBtn);

            const colorSelector = document.createElement('div');
            colorSelector.classList.add('color-selector');
            colorSelector.style.backgroundColor = player.color;
            colorSelector.addEventListener('click', (e) => showColorPalette(e, player, card, colorSelector));

            const changeColorBtn = document.createElement('button');
            changeColorBtn.classList.add('change-color-btn');
            changeColorBtn.textContent = '切换颜色';
            changeColorBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click or other underlying events
                showColorPalette(e, player, card, colorSelector); // Pass the colorSelector element for positioning
            });

            // Group actions for layout
            const actionsGroup = document.createElement('div');
            actionsGroup.classList.add('card-actions-group');
            actionsGroup.appendChild(quickActionsDiv);
            actionsGroup.appendChild(changeColorBtn);

            bottomRow.appendChild(colorSelector); // Color selector on the left
            bottomRow.appendChild(actionsGroup); // Grouped buttons on the right
            card.appendChild(bottomRow);
            playerCardsSetupDiv.appendChild(card);
        });
        addDragAndDropHandlers();
        updateOrderIndicatorsDOM();
    }

    playerCountInput.addEventListener('change', () => {
        const currentCount = parseInt(playerCountInput.value);
        if (currentCount > 0 && currentCount <= 10) { // Max 10 players now
            generatePlayersArray(currentCount);
            renderPlayerCardsSetup();
            saveSettings();
        } else {
            playerCountInput.value = players.length > 0 ? players.length : 3; // Revert to old or default
            alert(`玩家数量必须在 1 到 ${availableColors.length} 之间。`);
        }
    });

    // Add a class to invalid time inputs for styling
    const style = document.createElement('style');
    style.innerHTML = `
        .time-input.invalid-input {
            border-color: red !important;
            box-shadow: 0 0 3px red;
        }
    `;
    document.head.appendChild(style);

    function showColorPalette(event, player, cardElement, selectorElement) {
        event.stopPropagation();
        const existingPalette = document.querySelector('.color-palette');
        if (existingPalette) existingPalette.remove();

        const palette = document.createElement('div');
        palette.classList.add('color-palette');
        availableColors.forEach(color => {
            const colorOption = document.createElement('div');
            colorOption.classList.add('color-option');
            colorOption.style.backgroundColor = color;
            colorOption.addEventListener('click', (e) => {
                e.stopPropagation();
                const originalColorOfCurrentPlayer = player.color;
                const conflictingPlayer = players.find(p => p.id !== player.id && p.color === color);

                player.color = color;
                cardElement.style.backgroundColor = color;
                selectorElement.style.backgroundColor = color;

                if (conflictingPlayer) {
                    // Assign original color of current player to the conflicting player
                    conflictingPlayer.color = originalColorOfCurrentPlayer;
                    // Update the UI for the conflicting player
                    const conflictingCardElement = playerCardsSetupDiv.querySelector(`.player-card[data-player-id="${conflictingPlayer.id}"]`);
                    const conflictingColorSelector = conflictingCardElement ? conflictingCardElement.querySelector('.color-selector') : null;
                    if (conflictingCardElement) conflictingCardElement.style.backgroundColor = originalColorOfCurrentPlayer;
                    if (conflictingColorSelector) conflictingColorSelector.style.backgroundColor = originalColorOfCurrentPlayer;
                }

                saveSettings();
                palette.remove();
                if (window.closePaletteHandler) {
                    document.removeEventListener('click', window.closePaletteHandler);
                    delete window.closePaletteHandler;
                }
            });
            palette.appendChild(colorOption);
        });
        document.body.appendChild(palette);
        // Use the triggering button (event.currentTarget) for positioning
        const buttonRect = event.currentTarget.getBoundingClientRect();
        palette.style.position = 'absolute';
        palette.style.top = `${buttonRect.bottom + window.scrollY + 5}px`; // Add a small offset
        palette.style.left = `${buttonRect.left + window.scrollX}px`;

        window.closePaletteHandler = (e) => {
            if (!palette.contains(e.target)) {
                palette.remove();
                document.removeEventListener('click', window.closePaletteHandler);
                delete window.closePaletteHandler;
            }
        };
        setTimeout(() => document.addEventListener('click', window.closePaletteHandler), 0);
    }

    // --- Drag and Drop --- 
    let draggedItem = null;
    function addDragAndDropHandlers() {
        const items = playerCardsSetupDiv.querySelectorAll('.player-card');
        items.forEach(item => {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragend', handleDragEnd);
        });
    }

    function handleDragStart(e) {
        draggedItem = this;
        setTimeout(() => this.classList.add('dragging'), 0);
    }

    function handleDragOver(e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(playerCardsSetupDiv, e.clientY);
        if (afterElement == null) {
            playerCardsSetupDiv.appendChild(draggedItem);
        } else {
            playerCardsSetupDiv.insertBefore(draggedItem, afterElement);
        }
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.player-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function handleDrop() {
        // Logic handled by dragover and dragend
    }

    function handleDragEnd() {
        this.classList.remove('dragging');
        updatePlayerOrderFromDOM();
        draggedItem = null;
    }

    function updatePlayerOrderFromDOM() {
        const cardElements = playerCardsSetupDiv.querySelectorAll('.player-card');
        const newPlayersOrder = [];
        cardElements.forEach((card, index) => {
            const player = players.find(p => p.id === card.dataset.playerId);
            if (player) {
                player.order = index;
                newPlayersOrder.push(player);
            }
        });
        players = newPlayersOrder; // Re-assign players array with new order
        updateOrderIndicatorsDOM();
        saveSettings();
    }

    function updateOrderIndicatorsDOM() {
        const cardElements = playerCardsSetupDiv.querySelectorAll('.player-card');
        cardElements.forEach((card, index) => {
            const orderIndicator = card.querySelector('.order-indicator');
            if (orderIndicator) orderIndicator.textContent = index + 1;
            card.dataset.order = index; // Update data attribute as well
        });
    }

    function moveToPosition(playerId, newPosition) {
        const playerIndex = players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;

        const [playerToMove] = players.splice(playerIndex, 1);
        players.splice(newPosition, 0, playerToMove);

        players.forEach((p, index) => p.order = index);
        renderPlayerCardsSetup(); // Re-render to reflect new order
        saveSettings();
    }

    // --- Game In Progress --- 
    const turnSwitchSound = new Audio('turn-switch.mp3'); // Placeholder for sound file

    startGameBtn.addEventListener('click', () => {
        if (players.length === 0) {
            alert('请至少添加一名玩家。');
            return;
        }
        saveSettings(); // Save final setup before starting
        playerSetupSection.classList.remove('active-section');
        gameInProgressSection.classList.add('active-section');
        gamePaused = true; // 设置为暂停状态
        pauseResumeBtn.textContent = '继续 (S)';
        pauseResumeBtn.disabled = false;
        nextTurnBtn.disabled = true;
        players.forEach(p => {
            p.time = 0; 
            p.eliminated = false;
            // 为每个玩家加载BGM，使用玩家名字
            loadPlayerBgm(p.name);
        });
        currentPlayerIndex = 0;
        renderPlayerCardsGame();
        startPlayerTurn(players[currentPlayerIndex]);
    });

    function updatePlayerCardTimeDisplay(player, timeToDisplay) {
        const cardElement = playerCardsGameDiv.querySelector(`.player-card[data-player-id="${player.id}"]`);
        if (cardElement) {
            const timeDisplay = cardElement.querySelector('.player-time-game');
            if (timeDisplay) {
                timeDisplay.textContent = formatTime(timeToDisplay);
            }
        }
    }

    // 狗屎啊 这个函数调用方是谁啊？
    function handleTimeUp(player) {
        // This function is not actively used in Mode 1 as time counts up.
        // Kept for potential future modes or if Mode 1 rules change to include a time limit.
        timeUpSound.play().catch(e => console.warn("Time up sound play failed", e));
        console.log(`${player.name}'s time is up (if applicable to current mode).`);
        // If Mode 1 were to have a max time, logic would go here.
    }

    function renderPlayerCardsGame() {
        playerCardsGameDiv.innerHTML = '';
        players.forEach((player, index) => {
            // 创建玩家卡片和按钮的容器组
            const playerGroup = document.createElement('div');
            playerGroup.classList.add('player-group');

            const card = document.createElement('div');
            card.classList.add('player-card', 'game-card');
            card.style.backgroundColor = player.color;
            card.dataset.playerId = player.id;
            if (player.passed) {
                card.classList.add('passed');
            }

            // 添加音乐图标
            const musicIcon = document.createElement('div');
            musicIcon.classList.add('music-icon');
            musicIcon.innerHTML = '<i class="fas fa-music"></i>';
            console.log('playerBgmMap.has(player.name)', playerBgmMap.has(player.name),player.name,playerBgmMap)
            musicIcon.style.display = playerBgmMap.has(player.name) ? 'block' : 'none';
            card.appendChild(musicIcon);

            const nameDisplay = document.createElement('div');
            nameDisplay.classList.add('player-name-game');
            nameDisplay.textContent = player.name;
            card.appendChild(nameDisplay);

            const timeDisplay = document.createElement('div');
            timeDisplay.classList.add('player-time-game');
            timeDisplay.textContent = formatTime(player.time);
            card.appendChild(timeDisplay);

            // 创建下一位按钮容器
            const nextPlayerContainer = document.createElement('div');
            nextPlayerContainer.classList.add('next-player-container');
            
            // 添加下一位玩家按键
            const nextPlayerBtn = document.createElement('button');
            nextPlayerBtn.classList.add('next-player-btn');
            nextPlayerBtn.textContent = `下一位 (${index + 1})`;
            nextPlayerBtn.disabled = true; // 默认禁用
            nextPlayerBtn.addEventListener('click', () => {
                if (!gamePaused && player.id === players[currentPlayerIndex].id) {
                    switchToNextPlayer();
                }
            });
            nextPlayerContainer.appendChild(nextPlayerBtn);

            // 创建passby按钮容器
            const passbyContainer = document.createElement('div');
            passbyContainer.classList.add('passby-container');
            
            // 添加passby按钮
            const passbyBtn = document.createElement('button');
            passbyBtn.classList.add('passby-btn');
            passbyBtn.textContent = 'Pass';
            passbyBtn.disabled = player.passed; // 如果已经pass则禁用
            passbyBtn.addEventListener('click', () => {
                if (!gamePaused && player.id === players[currentPlayerIndex].id) {
                    player.passed = true;
                    card.classList.add('passed');
                    passbyBtn.disabled = true;
                    switchToNextPlayer();
                }
            });
            passbyContainer.appendChild(passbyBtn);

            card.addEventListener('click', () => {
                if (player.passed) return; // 如果玩家已经pass，不做任何操作
                
                if (player.id === players[currentPlayerIndex].id) {
                    if (!gamePaused) {
                        switchToNextPlayer();
                    }
                } else {
                    switchToPlayer(player);
                }
            });

            // 将卡片和按钮容器添加到组中
            playerGroup.appendChild(card);
            playerGroup.appendChild(nextPlayerContainer);
            playerGroup.appendChild(passbyContainer);
            playerCardsGameDiv.appendChild(playerGroup);
        });
        highlightActivePlayerCard();

        // 在游戏控制区域添加Next Round Start按钮
        const gameControlsDiv = document.querySelector('.game-controls');
        if (gameControlsDiv) {
            // 先移除已存在的Next Round Start按钮
            const existingNextRoundBtn = gameControlsDiv.querySelector('.next-round-btn');
            if (existingNextRoundBtn) {
                existingNextRoundBtn.remove();
            }
            
            // 创建Next Round Start按钮
            const nextRoundBtn = document.createElement('button');
            nextRoundBtn.classList.add('next-round-btn');
            nextRoundBtn.textContent = 'Next Round Start';
            nextRoundBtn.addEventListener('click', () => {
                showOrderAdjustmentModal();
            });
            gameControlsDiv.appendChild(nextRoundBtn);
        }
    }

    function highlightActivePlayerCard() {
        document.querySelectorAll('#player-cards-game .player-card').forEach(card => {
            card.classList.remove('active-player', 'paused');
            const nextPlayerBtn = card.parentElement.querySelector('.next-player-btn');
            if (nextPlayerBtn) {
                nextPlayerBtn.disabled = true;
            }
            
            if (card.dataset.playerId === players[currentPlayerIndex].id) {
                card.classList.add('active-player');
                if (gamePaused) {
                    card.classList.add('paused');
                }
                // 启用当前玩家的下一位按键
                const nextPlayerBtn = card.parentElement.querySelector('.next-player-btn');
                if (nextPlayerBtn) {
                    nextPlayerBtn.disabled = false;
                }
            }
        });
    }

    function startPlayerTurn(player) {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        currentPlayerIndex = players.findIndex(p => p.id === player.id);
        currentTurnStartTime = Date.now();
        highlightActivePlayerCard();
        
        // 先播放切换音效，然后播放BGM
        playTurnSwitchSound();
        playPlayerBgm(player.name);

        timerInterval = setInterval(() => {
            if (!gamePaused) {
                const currentTime = Date.now();
                const elapsedTime = (currentTime - currentTurnStartTime) / 1000;
                player.time += elapsedTime;
                currentTurnStartTime = currentTime;
                updatePlayerCardTimeDisplay(player, player.time);
            }
        }, 100);
    }

    function stopCurrentPlayerTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            const player = players[currentPlayerIndex];
            const endTime = Date.now();
            const elapsedSeconds = (endTime - currentTurnStartTime) / 1000;
            player.time += elapsedSeconds;
            updatePlayerCardTimeDisplay(player, player.time); 
            currentTurnStartTime = 0;
        }
    }

    function switchToNextPlayer() {
        if (players.length === 0) return;

        stopCurrentPlayerTimer();
        const currentPlayer = players[currentPlayerIndex];
        
        // 暂停当前玩家的BGM，使用玩家名字
        pausePlayerBgm(currentPlayer.name);

        playTurnSwitchFeedback(players[currentPlayerIndex].id);
        
        let nextIndex = (currentPlayerIndex + 1) % players.length;
        let allPassed = true;
        
        while (players[nextIndex].passed) {
            nextIndex = (nextIndex + 1) % players.length;
            if (nextIndex === currentPlayerIndex) {
                allPassed = true;
                break;
            }
        }
        
        if (!players[nextIndex].passed) {
            allPassed = false;
        }
        
        if (allPassed) {
            console.log("进入暂停状态")
            gamePaused = true;
            pauseResumeBtn.textContent = '继续 (S)';
            nextTurnBtn.disabled = true;
            highlightActivePlayerCard();
            return;
        }
        
        currentPlayerIndex = nextIndex;
        startPlayerTurn(players[currentPlayerIndex]);
    }

    function switchToPlayer(player) {
        if (player.passed) return; // 不能切换到已pass的玩家
        if (player.id === players[currentPlayerIndex].id) return; // 如果点击的是当前玩家，不做任何操作
        
        stopCurrentPlayerTimer();
        playTurnSwitchFeedback(players[currentPlayerIndex].id); 
        currentPlayerIndex = players.findIndex(p => p.id === player.id);
        highlightActivePlayerCard();
        
        // 如果游戏是暂停状态，不启动计时器
        if (!gamePaused) {
            startPlayerTurn(player);
        }
    }

    function playTurnSwitchFeedback(playerId) {
        const cardElement = playerCardsGameDiv.querySelector(`.player-card[data-player-id="${playerId}"]`);
        if (cardElement) {
            cardElement.classList.add('flash');
            setTimeout(() => cardElement.classList.remove('flash'), 300);
        }
    }

    pauseResumeBtn.addEventListener('click', () => {
        gamePaused = !gamePaused;
        if (gamePaused) {
            stopCurrentPlayerTimer();
            pauseResumeBtn.textContent = '继续 (S)';
            nextTurnBtn.disabled = true;
            // 暂停当前玩家的BGM，使用玩家名字
            pausePlayerBgm(players[currentPlayerIndex].name);
        } else {
            pauseResumeBtn.textContent = '暂停 (S)';
            nextTurnBtn.disabled = false;
            startPlayerTurn(players[currentPlayerIndex]);
        }
        highlightActivePlayerCard();
    });

    nextTurnBtn.addEventListener('click', () => { // Manual next turn button
        if (!gamePaused && players.length > 0) {
            switchToNextPlayer();
        }
    });

    newGameInProgressBtn.addEventListener('click', () => {
        showConfirmationModal('确定要开始新游戏吗？当前游戏进度将丢失。', () => {
            resetGameToSetup();
        });
    });

    document.addEventListener('keydown', (e) => {
        console.log('keydown', e.key)
        if (gameInProgressSection.classList.contains('active-section')) {
            // 检查是否按下了数字键
            if (e.key >= '1' && e.key <= '9') {
                const playerIndex = parseInt(e.key) - 1;
                if (playerIndex < players.length && playerIndex === currentPlayerIndex) {
                    e.preventDefault();
                    switchToNextPlayer();
                }
            }
            // 检查是否按下了S键
            if (e.key.toLowerCase() === 's') {
                e.preventDefault();
                pauseResumeBtn.click();
            }
        }
    });

    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const tenths = Math.floor((totalSeconds % 1) * 10); // 获取0.1秒的精度
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
    }

    // --- Modal Logic --- 
    function showConfirmationModal(message, onConfirm, showCancel = true) {
        modalMessage.textContent = message;
        confirmationModal.style.display = 'flex';
        confirmActionBtn.onclick = () => {
            onConfirm();
            confirmationModal.style.display = 'none';
        };
        if (showCancel) {
            cancelActionBtn.style.display = 'inline-block';
            cancelActionBtn.onclick = () => {
                confirmationModal.style.display = 'none';
            };
        } else {
            cancelActionBtn.style.display = 'none';
        }
    }

    function resetGameToSetup() {
        if (timerInterval) clearInterval(timerInterval);
        gamePaused = false;
        gameInProgressSection.classList.remove('active-section');
        playerSetupSection.classList.add('active-section');
        // Reload settings or generate defaults for the setup screen
        initializeApp(); 
    }

    function showOrderAdjustmentModal() {
        // 重置所有玩家的pass状态
        players.forEach(player => {
            player.passed = false;
        });

        // 清空并重新填充调整列表
        orderAdjustmentList.innerHTML = '';
        players.forEach((player, index) => {
            const item = document.createElement('div');
            item.classList.add('order-adjustment-item');
            item.dataset.playerId = player.id;

            const playerInfo = document.createElement('div');
            playerInfo.classList.add('player-info');

            const colorIndicator = document.createElement('div');
            colorIndicator.classList.add('player-color');
            colorIndicator.style.backgroundColor = player.color;

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('player-name');
            nameSpan.textContent = player.name;

            playerInfo.appendChild(colorIndicator);
            playerInfo.appendChild(nameSpan);

            const orderControls = document.createElement('div');
            orderControls.classList.add('order-controls');

            const moveUpBtn = document.createElement('button');
            moveUpBtn.classList.add('order-btn');
            moveUpBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
            moveUpBtn.disabled = index === 0;
            moveUpBtn.addEventListener('click', () => movePlayerInOrder(player.id, 'up'));

            const moveDownBtn = document.createElement('button');
            moveDownBtn.classList.add('order-btn');
            moveDownBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
            moveDownBtn.disabled = index === players.length - 1;
            moveDownBtn.addEventListener('click', () => movePlayerInOrder(player.id, 'down'));

            orderControls.appendChild(moveUpBtn);
            orderControls.appendChild(moveDownBtn);

            item.appendChild(playerInfo);
            item.appendChild(orderControls);
            orderAdjustmentList.appendChild(item);
        });

        orderAdjustmentModal.style.display = 'block';
    }

    function movePlayerInOrder(playerId, direction) {
        const currentIndex = players.findIndex(p => p.id === playerId);
        if (currentIndex === -1) return;

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= players.length) return;

        // 交换玩家位置
        [players[currentIndex], players[newIndex]] = [players[newIndex], players[currentIndex]];
        
        // 更新玩家顺序
        players.forEach((player, index) => {
            player.order = index;
        });

        // 重新渲染调整列表
        showOrderAdjustmentModal();
    }

    confirmOrderBtn.addEventListener('click', () => {
        orderAdjustmentModal.style.display = 'none';
        renderPlayerCardsGame();
        // 从第一位玩家开始计时
        currentPlayerIndex = 0;
        startPlayerTurn(players[currentPlayerIndex]);
    });

    cancelOrderBtn.addEventListener('click', () => {
        orderAdjustmentModal.style.display = 'none';
    });

    // --- Initial Load ---
    initializeApp();

    // 预加载音频
    turnStartSound.load();

    // 添加抽屉交互
    drawerToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        drawerContent.classList.toggle('active');
    });

    // 点击其他地方关闭抽屉
    document.addEventListener('click', (e) => {
        if (!drawerContent.contains(e.target) && !drawerToggle.contains(e.target)) {
            drawerContent.classList.remove('active');
        }
    });

    // 音频淡入淡出效果
    function fadeAudio(audio, targetVolume, duration, onComplete) {
        const startVolume = audio.volume;
        const startTime = Date.now();
        
        function updateVolume() {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            audio.volume = startVolume + (targetVolume - startVolume) * progress;
            
            if (progress < 1) {
                requestAnimationFrame(updateVolume);
            } else if (onComplete) {
                onComplete();
            }
        }
        
        updateVolume();
    }

    // 添加到播放队列
    function addToAudioQueue(audio, volume = 1) {
        audio.volume = 0; // 初始音量为0
        audioQueue.push({ audio, volume });
        if (!isPlayingQueue) {
            playNextInQueue();
        }
    }

    // 播放队列中的下一个音频
    function playNextInQueue() {
        if (audioQueue.length === 0) {
            isPlayingQueue = false;
            return;
        }

        isPlayingQueue = true;
        const { audio, volume } = audioQueue.shift();
        
        // 淡入效果
        fadeAudio(audio, volume, 100, () => {
            // 音频播放结束后淡出
            audio.addEventListener('ended', function onEnded() {
                fadeAudio(audio, 0, 100, () => {
                    audio.pause();
                    audio.removeEventListener('ended', onEnded);
                    playNextInQueue();
                });
            }, { once: true });

            // 如果是BGM，不需要等待ended事件
            if (audio.loop) {
                playNextInQueue();
            }
        });

        audio.play().catch(e => {
            console.warn('Failed to play audio:', e);
            playNextInQueue();
        });
    }

    // 修改BGM管理函数
    function loadPlayerBgm(playerName) {
        console.log('loadPlayerBgm', playerName)
        const bgm = new Audio(`${playerName}_bgm.mp3`);
        bgm.loop = true;
        bgm.volume = 0; // 初始音量为0
        
        bgm.addEventListener('canplaythrough', () => {
            playerBgmMap.set(playerName, bgm);
            renderPlayerCardsGame();
        });

        bgm.addEventListener('error', () => {
            console.warn(`Failed to load BGM for player ${playerName}`);
        });
    }

    function playPlayerBgm(playerName) {
        console.log('playPlayerBgm', playerName, playerBgmMap)
        const bgm = playerBgmMap.get(playerName);
        if (bgm) {
            bgm.currentTime = currentBgmPosition;
            addToAudioQueue(bgm, 0.5); // BGM音量设为0.5
        }
    }

    function pausePlayerBgm(playerName) {
        const bgm = playerBgmMap.get(playerName);
        if (bgm) {
            currentBgmPosition = bgm.currentTime;
            fadeAudio(bgm, 0, 500, () => {
                bgm.pause();
            });
        }
    }

    // 修改回合切换音效播放
    function playTurnSwitchSound() {
        const sound = new Audio('turn_start.mp3');
        addToAudioQueue(sound, 1); // 音效音量设为1
    }
});