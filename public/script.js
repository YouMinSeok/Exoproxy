// 모달 관련 요소들
const modalBackdrop = document.getElementById('modalBackdrop');
const modalWindow = document.getElementById('modalWindow');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModalBtn');

// 네비게이션 바 버튼들
const openFrontendModalBtn = document.getElementById('openFrontendModal');
const openFeaturesModalBtn = document.getElementById('openFeaturesModal');
const openStatusModalBtn = document.getElementById('openStatusModal');
const openTerminalModalBtn = document.getElementById('openTerminalModal');
const powerOffBtn = document.getElementById('powerOffBtn');

// 터미널 관련 변수들
let terminalOutput, terminalInput;
let terminalOpen = false;
let terminalBuffer = [];

// 터미널 로그 추가 함수
function appendTerminalLog(msg) {
    if (terminalOpen && terminalOutput) {
        appendTerminalOutput(msg);
    } else {
        terminalBuffer.push(msg);
    }
}

// 모달 열기 함수
function openModal(title, templateId) {
    // 터미널 모달일 경우 아이콘 추가
    if (templateId === 'terminalTemplate') {
        modalTitle.innerHTML = `💻 ${title}`; // 터미널 아이콘 추가
    } else {
        modalTitle.textContent = title;
    }

    modalContent.innerHTML = '';
    const tmpl = document.getElementById(templateId);
    const clone = document.importNode(tmpl.content, true);
    modalContent.appendChild(clone);
    modalBackdrop.style.display = 'flex';

    modalWindow.style.width = '600px';
    modalWindow.style.height = '400px';

    if (templateId === 'frontendTemplate') {
        initFrontendForm();
    } else if (templateId === 'featuresTemplate') {
        initFeaturesForm();
    } else if (templateId === 'statusTemplate') {
        updateStatus();
    } else if (templateId === 'terminalTemplate') {
        initTerminal();
    } else if (templateId === 'confirmPoweroffTemplate') {
        initConfirmPoweroff();
    } else if (templateId === 'encryptWarnTemplate') {
        initEncryptWarnConfirm((confirm) => {
            if (confirm) {
                toggleFeature('encrypt', true);
            } else {
                // 경로 암호화 취소 시 체크박스 원상복구
                openModal('기능 활성화', 'featuresTemplate');
                updateFeaturesState();
            }
        });
    }
}

// 모달 닫기 함수
function closeModal() {
    modalBackdrop.style.display = 'none';
    modalTitle.innerHTML = ''; // 텍스트로 변경
    modalContent.innerHTML = '';
}

// 모달 닫기 버튼 이벤트
closeModalBtn.addEventListener('click', closeModal);

// 네비게이션 바 버튼들에 클릭 이벤트 추가
openFrontendModalBtn.addEventListener('click', () => {
    openModal('프론트엔드 URL 등록', 'frontendTemplate');
});

openFeaturesModalBtn.addEventListener('click', () => {
    openModal('기능 활성화', 'featuresTemplate');
    updateFeaturesState();
});

openStatusModalBtn.addEventListener('click', () => {
    openModal('상태 패널', 'statusTemplate');
});

openTerminalModalBtn.addEventListener('click', () => {
    openModal('터미널', 'terminalTemplate');
});

powerOffBtn.addEventListener('click', () => {
    openModal('시스템 종료', 'confirmPoweroffTemplate');
});

// 시스템 종료 확인 모달 초기화
function initConfirmPoweroff() {
    const yesBtn = modalContent.querySelector('#confirmYesBtn');
    const noBtn = modalContent.querySelector('#confirmNoBtn');

    yesBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('http://localhost:5000/poweroff', { method: 'POST' });
            const data = await res.json();
            appendTerminalLog(data.message);
            // Electron IPC 이벤트 전송 (Electron 환경 가정)
            if (window.ipcRenderer) {
                window.ipcRenderer.send('poweroff');
            } else {
                console.log('Poweroff command sent.');
            }
        } catch (error) {
            console.error('Poweroff failed:', error);
            appendTerminalLog('파워 오프에 실패했습니다.');
        }
    });

    noBtn.addEventListener('click', () => {
        closeModal();
    });
}

// 경로 암호화 확인 모달 초기화
function initEncryptWarnConfirm(callback) {
    const yesBtn = modalContent.querySelector('#encryptYesBtn');
    const noBtn = modalContent.querySelector('#encryptNoBtn');
    yesBtn.addEventListener('click', () => {
        closeModal();
        callback(true);
    });
    noBtn.addEventListener('click', () => {
        closeModal();
        callback(false);
    });
}

// 기능 토글 함수
async function toggleFeature(feature, enabled) {
    try {
        const res = await fetch('http://localhost:5000/toggle-feature', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feature, enabled }),
        });
        const result = await res.json();
        appendTerminalLog(result.message);
        openModal('기능 활성화', 'featuresTemplate');
        updateFeaturesState();
    } catch (error) {
        console.error(`Failed to toggle feature ${feature}:`, error);
        appendTerminalLog(`기능 토글에 실패했습니다: ${feature}`);
    }
}

// 기능 상태 업데이트 함수
async function updateFeaturesState() {
    try {
        const featuresRes = await fetch('http://localhost:5000/features');
        const featuresData = await featuresRes.json();
        const checkboxes = modalContent.querySelectorAll('.features-grid input[type="checkbox"]');
        checkboxes.forEach((checkbox) => {
            checkbox.checked = !!featuresData[checkbox.name];
            checkbox.onchange = async () => {
                const feature = checkbox.name;
                const enabled = checkbox.checked;

                if (feature === 'encrypt' && enabled === true) {
                    // 경로 암호화 경고 모달
                    closeModal();
                    openModal('경고', 'encryptWarnTemplate');
                } else {
                    toggleFeature(feature, enabled);
                }
            };
        });
    } catch (error) {
        console.error('Failed to update features state:', error);
        appendTerminalLog('기능 상태 업데이트에 실패했습니다.');
    }
}

// 기능 활성화 폼 초기화
function initFeaturesForm() {
    updateFeaturesState();
}

// 프론트엔드 URL 등록 폼 초기화
function initFrontendForm() {
    const frontendForm = modalContent.querySelector('#frontendForm');
    frontendForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const frontendUrl = modalContent.querySelector('#frontendUrl').value;
        try {
            const response = await fetch('http://localhost:5000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ frontendUrl }),
            });
            const result = await response.json();
            alert(result.message);
            appendTerminalLog(result.message);
        } catch (error) {
            console.error('Failed to register frontend URL:', error);
            appendTerminalLog('프론트엔드 URL 등록에 실패했습니다.');
        }
    });
}

// 상태 패널 업데이트 함수
async function updateStatus() {
    try {
        const statusRes = await fetch('http://localhost:5000/status');
        const statusData = await statusRes.json();
        const featuresRes = await fetch('http://localhost:5000/features');
        const featuresData = await featuresRes.json();

        if (modalContent.querySelector('#apiStatusValue')) {
            modalContent.querySelector('#apiStatusValue').textContent = statusData.apiStatus;
            modalContent.querySelector('#encryptStatus').textContent = featuresData.encrypt ? 'ON' : 'OFF';
            modalContent.querySelector('#dataEncryptStatus').textContent = featuresData.dataEncrypt ? 'ON' : 'OFF';
            modalContent.querySelector('#fileEncryptStatus').textContent = featuresData.fileEncrypt ? 'ON' : 'OFF';
            modalContent.querySelector('#distributionStatus').textContent = featuresData.randomDistribution ? 'ON' : 'OFF';
            modalContent.querySelector('#ipHideStatus').textContent = featuresData.ipHide ? 'ON' : 'OFF';
            modalContent.querySelector('#anonymityStatus').textContent = featuresData.anonymity ? 'ON' : 'OFF';
        }
    } catch (error) {
        console.error('Failed to update status:', error);
        appendTerminalLog('상태 패널 업데이트에 실패했습니다.');
    }
}

// 터미널 초기화 함수
function initTerminal() {
    terminalOutput = modalContent.querySelector('#terminalOutput');
    terminalInput = modalContent.querySelector('#terminalInput');
    terminalOpen = true;

    // 버퍼 내용 출력
    while (terminalBuffer.length > 0) {
        appendTerminalOutput(terminalBuffer.shift());
    }

    terminalInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const command = terminalInput.value.trim();
            if (!command) return;
            try {
                const commandRes = await fetch('http://localhost:5000/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command }),
                });
                const commandData = await commandRes.json();
                appendTerminalLog(`> ${command}`);
                appendTerminalLog(commandData.output);
                terminalInput.value = '';

                if (command === 'poweroff') {
                    const offRes = await fetch('http://localhost:5000/poweroff', { method: 'POST' });
                    const offData = await offRes.json();
                    appendTerminalLog(offData.message);
                    // Electron IPC 이벤트 전송 (Electron 환경 가정)
                    if (window.ipcRenderer) {
                        window.ipcRenderer.send('poweroff');
                    } else {
                        console.log('Poweroff command sent.');
                    }
                }
            } catch (error) {
                console.error('Command execution failed:', error);
                appendTerminalLog('명령어 실행에 실패했습니다.');
            }
        }
    });
}

// 터미널 출력 추가 함수
function appendTerminalOutput(text) {
    const line = document.createElement('div');
    line.textContent = text;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// 모달 드래그 및 리사이즈 초기화 함수
function initModalDragging() {
    let isDragging = false;
    let dragStartX, dragStartY;

    const modalHeader = modalWindow.querySelector('.modal-header');

    modalHeader.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onDragEnd);
    });

    function onDrag(e) {
        if (!isDragging) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        modalWindow.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    function onDragEnd(e) {
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', onDragEnd);
        const rect = modalWindow.getBoundingClientRect();
        modalWindow.style.transform = 'none';
        modalWindow.style.position = 'fixed';
        modalWindow.style.left = `${rect.left}px`;
        modalWindow.style.top = `${rect.top}px`;
    }

    let isResizing = false;
    let resizeStartX, resizeStartY;
    let initialWidth, initialHeight;
    const resizeHandle = modalWindow.querySelector('#modalResizeHandle');

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        const rect = modalWindow.getBoundingClientRect();
        initialWidth = rect.width;
        initialHeight = rect.height;
        document.addEventListener('mousemove', onResize);
        document.addEventListener('mouseup', onResizeEnd);
    });

    function onResize(e) {
        if (!isResizing) return;
        const dx = e.clientX - resizeStartX;
        const dy = e.clientY - resizeStartY;
        modalWindow.style.width = `${initialWidth + dx}px`;
        modalWindow.style.height = `${initialHeight + dy}px`;
    }

    function onResizeEnd(e) {
        isResizing = false;
        document.removeEventListener('mousemove', onResize);
        document.removeEventListener('mouseup', onResizeEnd);
    }
}

initModalDragging();

// 정기 상태 업데이트 (status 패널 열려있을 때)
setInterval(() => {
    if (modalContent.querySelector('#apiStatusValue')) {
        updateStatus();
    }
}, 5000);
