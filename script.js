document.addEventListener('DOMContentLoaded', () => {
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

    let currentTimerMode = 1; // Default to mode 1
    const timerModeSettings = {
        1: { name: "模式一：正向计时", description: "从 0 开始累计每位玩家单次行动时间。" }
    }; // Made const as it's now fixed

    let players = [];
    let currentPlayerIndex = 0;
    let timerInterval = null;
    let gamePaused = false;
    let currentTurnStartTime = 0; // Timestamp for the start of the active player's current segment of time
    // let turnSwitchSound = new Audio('ding.mp3'); // Load your sound effect

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

            if (count === 3 && i < defaultPlayerNames.length) {
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
                order: i
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
    const timeUpSound = new Audio('time-up.mp3'); // Placeholder for sound file

    startGameBtn.addEventListener('click', () => {

        if (players.length === 0) {
            alert('请至少添加一名玩家。');
            return;
        }
        saveSettings(); // Save final setup before starting
        playerSetupSection.classList.remove('active-section');
        gameInProgressSection.classList.add('active-section');
        gamePaused = false;
        pauseResumeBtn.textContent = '暂停';
        pauseResumeBtn.disabled = false;
        nextTurnBtn.disabled = false; // Assuming nextTurnBtn is still part of UI for manual advance
        players.forEach(p => {
            p.time = 0; 
            p.eliminated = false;
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

    function handleTimeUp(player) {
        // This function is not actively used in Mode 1 as time counts up.
        // Kept for potential future modes or if Mode 1 rules change to include a time limit.
        timeUpSound.play().catch(e => console.warn("Time up sound play failed", e));
        console.log(`${player.name}'s time is up (if applicable to current mode).`);
        // If Mode 1 were to have a max time, logic would go here.
    }

    function renderPlayerCardsGame() {
        playerCardsGameDiv.innerHTML = '';
        players.forEach((player) => {
            const card = document.createElement('div');
            card.classList.add('player-card', 'game-card');
            card.style.backgroundColor = player.color;
            card.dataset.playerId = player.id;

            const nameDisplay = document.createElement('div');
            nameDisplay.classList.add('player-name-game');
            nameDisplay.textContent = player.name;
            card.appendChild(nameDisplay);

            const timeDisplay = document.createElement('div');
            timeDisplay.classList.add('player-time-game');
            timeDisplay.textContent = formatTime(player.time);
            card.appendChild(timeDisplay);

            card.addEventListener('click', () => {
                if (gamePaused || player.id !== players[currentPlayerIndex].id) {
                    // If game is paused, or clicked card is not the current player, switch to this player
                    // (This allows selecting any player to be next, not just sequential)
                    if (!gamePaused) {
                         const targetPlayerIndex = players.findIndex(p => p.id === player.id);
                         if (targetPlayerIndex !== -1) {
                            switchToPlayer(players[targetPlayerIndex]);
                         }
                    }
                } else {
                    // Clicked on the current active player, advance to next sequential player
                    switchToNextPlayer();
                }
            });
            playerCardsGameDiv.appendChild(card);
        });
        highlightActivePlayerCard();
    }

    function highlightActivePlayerCard() {
        document.querySelectorAll('#player-cards-game .player-card').forEach(card => {
            card.classList.remove('active-player', 'paused');
            if (card.dataset.playerId === players[currentPlayerIndex].id) {
                card.classList.add('active-player');
                if (gamePaused) {
                    card.classList.add('paused');
                }
            }
        });
    }

    function startPlayerTurn(player) {
        if (timerInterval) clearInterval(timerInterval);
        if (gamePaused) return;

        currentPlayerIndex = players.findIndex(p => p.id === player.id);
        currentTurnStartTime = Date.now(); 
        highlightActivePlayerCard();
        turnSwitchSound.play().catch(e => console.warn("Turn switch sound play failed", e));

        // Mode 1: Count up
        timerInterval = setInterval(() => {
            if (gamePaused) return;
            const elapsedTimeInTurn = (Date.now() - currentTurnStartTime) / 1000;
            const totalPlayerTime = player.time + elapsedTimeInTurn;
            updatePlayerCardTimeDisplay(player, totalPlayerTime);
        }, 250); 
    }

    function stopCurrentPlayerTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            const player = players[currentPlayerIndex];
            // Mode 1: Accumulate time
            const endTime = Date.now();
            const elapsedSeconds = (endTime - currentTurnStartTime) / 1000;
            player.time += elapsedSeconds;
            updatePlayerCardTimeDisplay(player, player.time); 
            currentTurnStartTime = 0;
        }
    }

    function switchToNextPlayer() {
        stopCurrentPlayerTimer();
        playTurnSwitchFeedback(players[currentPlayerIndex].id);
        let nextIndex = (currentPlayerIndex + 1) % players.length;
        currentPlayerIndex = nextIndex;
        startPlayerTurn(players[currentPlayerIndex]);
    }

    function switchToPlayer(player) {
        if (player.eliminated) return; // Cannot switch to an eliminated player (general case, though elimination is mode-specific)
        if (player.id === players[currentPlayerIndex].id && !gamePaused) return; 
        stopCurrentPlayerTimer();
        playTurnSwitchFeedback(players[currentPlayerIndex].id); 
        startPlayerTurn(player);
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
            pauseResumeBtn.textContent = '继续';
            nextTurnBtn.disabled = true;
        } else {
            pauseResumeBtn.textContent = '暂停';
            nextTurnBtn.disabled = false;
            startPlayerTurn(players[currentPlayerIndex]); // Resume with the current player
        }
        highlightActivePlayerCard(); // Update visual state
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
        if (gameInProgressSection.classList.contains('active-section') && !gamePaused) {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                switchToNextPlayer();
            }
        }
    });

    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

    // --- Initial Load ---
    initializeApp();
});