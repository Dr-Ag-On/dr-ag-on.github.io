let players = [];
let currentPlayerIndex = 0;
let timers = [];
let isRunning = false;
let isPaused = false;

// 初始化玩家
function initPlayers(numPlayers) {
    players = [];
    const defaultNames = numPlayers === 3 ? ['雷锋', 'dulang', '开心'] : Array.from({ length: numPlayers }, (_, i) => `玩家${i + 1}`);
    const defaultColors = ['red', 'yellow', 'blue', 'green', 'purple', 'orange'];

    for (let i = 0; i < numPlayers; i++) {
        players.push({
            id: defaultNames[i],
            time: 0,
            color: defaultColors[i % defaultColors.length],
            timer: null
        });
    }
}

// 渲染玩家卡片
function renderPlayers() {
    const playerDisplayArea = document.querySelector('.player-display-area');
    playerDisplayArea.innerHTML = '';

    players.forEach((player, index) => {
        const card = document.createElement('div');
        card.className = `player-card ${index === currentPlayerIndex ? 'current' : ''}`;
        card.style.backgroundColor = player.color;

        const idElement = document.createElement('div');
        idElement.className = 'player-id';
        idElement.textContent = player.id;

        const timeElement = document.createElement('div');
        timeElement.className = 'player-time';
        timeElement.textContent = formatTime(player.time);

        const sortButtons = document.createElement('div');
        sortButtons.className = 'sort-buttons';
        sortButtons.innerHTML = `
            <i class="fas fa-arrow-up" onclick="movePlayer(${index}, -1)"></i>
            <i class="fas fa-arrow-down" onclick="movePlayer(${index}, 1)"></i>
        `;

        const colorPicker = document.createElement('div');
        colorPicker.className = 'color-picker';
        colorPicker.style.backgroundColor = player.color;
        colorPicker.addEventListener('click', () => showColorPanel(index));

        card.appendChild(idElement);
        card.appendChild(timeElement);
        card.appendChild(sortButtons);
        card.appendChild(colorPicker);

        card.addEventListener('click', () => switchPlayer(index));
        playerDisplayArea.appendChild(card);
    });
}

// 格式化时间
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// 开始游戏
function startGame() {
    if (!isRunning) {
        isRunning = true;
        startTimer(currentPlayerIndex);
    }
}

// 开始计时
function startTimer(index) {
    players[index].timer = setInterval(() => {
        if (!isPaused) {
            players[index].time++;
            renderPlayers();
        }
    }, 1000);
}

// 切换玩家
function switchPlayer(index) {
    if (isRunning) {
        clearInterval(players[currentPlayerIndex].timer);
        currentPlayerIndex = index;
        startTimer(currentPlayerIndex);
        renderPlayers();
    }
}

// 暂停/继续游戏
function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pause-resume').textContent = isPaused ? '继续' : '暂停';
}

// 新建游戏
function newGame() {
    const confirmModal = document.getElementById('confirm-modal');
    const playerCountInput = document.getElementById('player-count-input');
    confirmModal.style.display = 'flex';
    // 显示当前玩家数量
    playerCountInput.value = players.length;
}

// 确认新建游戏
function confirmNewGame() {
    const playerCountInput = document.getElementById('player-count-input');
    const numPlayers = parseInt(playerCountInput.value);
    if (numPlayers >= 2 && numPlayers <= 6) {
        initPlayers(numPlayers);
        currentPlayerIndex = 0;
        isRunning = false;
        isPaused = false;
        timers.forEach(clearInterval);
        timers = [];
        renderPlayers();
    }
    document.getElementById('confirm-modal').style.display = 'none';
}

// 取消新建游戏
function cancelNewGame() {
    document.getElementById('confirm-modal').style.display = 'none';
}

// 移动玩家顺序
function movePlayer(index, direction) {
    if (index + direction >= 0 && index + direction < players.length) {
        [players[index], players[index + direction]] = [players[index + direction], players[index]];
        if (currentPlayerIndex === index) {
            currentPlayerIndex = index + direction;
        } else if (currentPlayerIndex === index + direction) {
            currentPlayerIndex = index;
        }
        renderPlayers();
    }
}

// 显示颜色选择面板
function showColorPanel(index) {
    const colorPanel = document.createElement('div');
    colorPanel.className = 'color-panel';
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

    colors.forEach(color => {
        const colorOption = document.createElement('div');
        colorOption.className = 'color-option';
        colorOption.style.backgroundColor = color;
        colorOption.addEventListener('click', () => {
            players[index].color = color;
            renderPlayers();
            colorPanel.remove();
        });
        colorPanel.appendChild(colorOption);
    });

    const playerCard = document.querySelectorAll('.player-card')[index];
    playerCard.appendChild(colorPanel);
}

// 初始化事件监听
function initEventListeners() {
    // 假设 HTML 中有一个 id 为 player-count-input 的输入框
    document.getElementById('player-count-input').addEventListener('input', function() {
        const numPlayers = parseInt(this.value);
        if (numPlayers < 2) this.value = 2;
        if (numPlayers > 6) this.value = 6;
    });
    try {
    document.getElementById('start-game').addEventListener('click', startGame);
} catch (error) {
    console.error('绑定开始游戏按钮事件失败:', error);
}
    document.getElementById('end-turn').addEventListener('click', () => switchPlayer((currentPlayerIndex + 1) % players.length));
    document.getElementById('pause-resume').addEventListener('click', togglePause);
    try {
    document.getElementById('new-game').addEventListener('click', newGame);
} catch (error) {
    console.error('绑定新建游戏按钮事件失败:', error);
}
    document.getElementById('confirm-new-game').addEventListener('click', confirmNewGame);
    document.getElementById('cancel-new-game').addEventListener('click', cancelNewGame);
}

// 初始化应用
function init() {
    initPlayers(3);
    renderPlayers();
    initEventListeners();
}

init();