document.addEventListener('DOMContentLoaded', () => {
    // 런처 버튼들
    const openFrontendModalBtn = document.getElementById('openFrontendModal');
    const openFeaturesModalBtn = document.getElementById('openFeaturesModal');
    const openStatusModalBtn = document.getElementById('openStatusModal');
    const openTerminalModalBtn = document.getElementById('openTerminalModal');
    const forwardProxyIcon = document.getElementById('forwardProxyIcon');
    const powerOffBtn = document.getElementById('powerOffBtn');
    const activitiesOverviewBtn = document.getElementById('activitiesOverviewBtn'); // 활동 개요 버튼

    // 활동 개요 오버레이 관련
    const overviewOverlay = document.getElementById('overviewOverlay');
    const closeOverviewBtn = document.getElementById('closeOverviewBtn');
    const snapshotContainer = document.getElementById('snapshotContainer');

    // 프록시 연결 상태 관련
    const disconnectContainer = document.getElementById('disconnectContainer');
    const disconnectButton = document.getElementById('disconnectButton');
    const proxyStatusMessage = document.getElementById('proxyStatusMessage');
    const connectionTimeSpan = document.getElementById('connectionTime');
    let connectionStartTime = null;
    let connectionTimer = null;

    // 창 목록을 저장할 배열
    let openWindows = [];

    // 창 타입별 창 ID를 관리할 객체
    const windowTypes = {}; // key: templateId, value: windowId

    // Z-Index 관리를 위한 변수
    let currentZIndex = 10000;

    // 활동 개요 열기 함수
    function openOverview() {
        overviewOverlay.style.display = 'flex';
    }

    // 활동 개요 닫기 함수
    function closeOverview() {
        overviewOverlay.style.display = 'none';
    }

    // 활동 개요 버튼 이벤트 리스너 추가
    activitiesOverviewBtn.addEventListener('click', () => {
        openOverview();
    });

    closeOverviewBtn.addEventListener('click', () => {
        closeOverview();
    });

    // 스냅샷을 활동 개요 오버레이 내에 추가하는 함수 (중복 방지)
    function addSnapshot(snapshot) {
        // 기존에 해당 창의 스냅샷이 있으면 제거
        removeSnapshot(snapshot.windowId);

        const snapshotDiv = document.createElement('div');
        snapshotDiv.classList.add('snapshot');
        snapshotDiv.setAttribute('data-window-id', snapshot.windowId);

        const img = document.createElement('img');
        img.src = snapshot.imgData;
        img.alt = `창 ${snapshot.windowId} 스냅샷`;

        const description = document.createElement('div');
        description.classList.add('snapshot-description');
        description.textContent = snapshot.title;

        const closeBtn = document.createElement('button');
        closeBtn.classList.add('snapshot-close-btn');
        closeBtn.innerHTML = '&times;';
        closeBtn.title = '스냅샷 삭제';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeSnapshot(snapshot.windowId);
        });

        snapshotDiv.appendChild(img);
        snapshotDiv.appendChild(description);
        snapshotDiv.appendChild(closeBtn);

        // 스냅샷 클릭 시 창 복원
        snapshotDiv.addEventListener('click', () => {
            restoreWindow(snapshot.windowId);
            closeOverview(); // 활동 개요 오버레이 닫기
        });

        snapshotContainer.appendChild(snapshotDiv);
    }

    // 스냅샷 제거 함수 (특정 windowId를 제거)
    function removeSnapshot(windowId) {
        const snapshotDiv = snapshotContainer.querySelector(`.snapshot[data-window-id="${windowId}"]`);
        if (snapshotDiv) {
            snapshotContainer.removeChild(snapshotDiv);
        }
    }

    // 스냅샷을 캡처하고 추가하는 함수
    function captureSnapshot(windowId) {
        const modal = document.getElementById(`modalWindow_${windowId}`);
        if (!modal) return;

        html2canvas(modal).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const windowObj = openWindows.find(win => win.id === windowId);
            if (!windowObj) return;

            const snapshot = {
                windowId: windowId,
                title: windowObj.title,
                imgData: imgData
            };
            addSnapshot(snapshot);
        }).catch(err => {
            console.error('스냅샷 캡처 실패:', err);
        });
    }

    // 창 복원 함수
    function restoreWindow(windowId) {
        console.log(`Attempting to restore window with ID: ${windowId}`);
        const backdrop = document.getElementById(`modalBackdrop_${windowId}`);
        if (backdrop) {
            backdrop.style.display = 'flex';
            backdrop.classList.add('show'); // 애니메이션을 위해 show 클래스 추가

            // 창 객체의 상태 업데이트
            const windowObj = openWindows.find(win => win.id === windowId);
            if (windowObj) {
                windowObj.isMinimized = false;
                console.log(`Window found: ${windowObj.title}`);
            } else {
                console.warn(`No window found with ID: ${windowId}`);
                return;
            }

            // 모달을 최상위로 설정
            backdrop.style.zIndex = ++currentZIndex;
            console.log(`Window ${windowId} zIndex set to ${backdrop.style.zIndex}`);

            // 창 포커싱
            focusWindow(windowId);
        } else {
            console.warn(`Backdrop not found for window ID: ${windowId}`);
        }
    }

    // 창 객체 생성 및 모달 열기 함수
    function createWindow(title, templateId, source) {
        // 창 타입별로 이미 열려있는지 확인
        if (windowTypes[templateId]) {
            const existingWindowId = windowTypes[templateId];
            focusWindow(existingWindowId);
            return;
        }

        const windowId = `window_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const windowObj = {
            id: windowId,
            title: title,
            templateId: templateId,
            isMinimized: false,
            isMaximized: false,
            source: source // 창을 연 원본 버튼 ID
        };
        openWindows.push(windowObj);
        windowTypes[templateId] = windowId; // 창 타입에 창 ID 매핑
        openModal(windowObj);
        updateActivitiesList();
    }

    // 모달 열기 함수
    function openModal(windowObj) {
        const { id, title, templateId, source } = windowObj;

        // 기존에 같은 ID의 모달이 있는지 확인
        if (document.getElementById(`modalBackdrop_${id}`)) {
            console.warn(`Modal with ID ${id} already exists.`);
            return;
        }

        // 모달 백드롭 생성
        const newBackdrop = document.createElement('div');
        newBackdrop.classList.add('modal-backdrop');
        newBackdrop.id = `modalBackdrop_${id}`;
        newBackdrop.style.display = 'flex';

        // 모달 창 생성
        const newModal = document.createElement('div');
        newModal.classList.add('modal');
        newModal.id = `modalWindow_${id}`;
        newModal.style.zIndex = ++currentZIndex; // 최상위 z-index 설정

        // 모달 헤더 생성
        const newModalHeader = document.createElement('div');
        newModalHeader.classList.add('modal-header');

        const newModalTitle = document.createElement('h2');
        newModalTitle.textContent = title;

        // 창 제어 버튼 (최소화, 최대화, 닫기)
        const windowControls = document.createElement('div');
        windowControls.classList.add('window-controls');

        const minimizeBtn = document.createElement('button');
        minimizeBtn.classList.add('minimize-btn');
        minimizeBtn.innerHTML = '_';
        minimizeBtn.title = '창 최소화';
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 드래그 방지
            captureSnapshot(id);
            minimizeWindow(id);
        });

        const maximizeBtn = document.createElement('button');
        maximizeBtn.classList.add('maximize-btn');
        maximizeBtn.innerHTML = '&#x26F6;'; // 최대화 아이콘
        maximizeBtn.title = '창 최대화';
        maximizeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 드래그 방지
            toggleMaximizeWindow(id);
        });

        const closeBtn = document.createElement('button');
        closeBtn.classList.add('close-btn');
        closeBtn.innerHTML = '&times;';
        closeBtn.title = '창 닫기';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 드래그 방지
            // 창을 닫을 때 스냅샷 캡처 제거
            closeModal(id);
        });

        windowControls.appendChild(minimizeBtn);
        windowControls.appendChild(maximizeBtn);
        windowControls.appendChild(closeBtn);

        newModalHeader.appendChild(newModalTitle);
        newModalHeader.appendChild(windowControls);

        // 모달 콘텐츠 생성
        const newModalContent = document.createElement('div');
        newModalContent.classList.add('modal-content');

        // 템플릿 내용 삽입
        const tmpl = document.getElementById(templateId);
        if (tmpl) {
            const clone = document.importNode(tmpl.content, true);
            newModalContent.appendChild(clone);
        } else {
            console.error(`Template with ID ${templateId} not found.`);
            return;
        }

        // 리사이즈 핸들 생성
        const newResizeHandle = document.createElement('div');
        newResizeHandle.classList.add('modal-resize-handle');

        // 모달 구조 조립
        newModal.appendChild(newModalHeader);
        newModal.appendChild(newModalContent);
        newModal.appendChild(newResizeHandle);
        newBackdrop.appendChild(newModal);
        document.body.appendChild(newBackdrop);

        // 애니메이션을 위해 show 클래스 추가
        setTimeout(() => {
            newBackdrop.classList.add('show');
        }, 10); // 브라우저가 클래스를 인식할 수 있도록 약간의 지연을 줌

        // 드래그 및 리사이즈 초기화
        initModalDragging(newModal, newBackdrop, id);

        // 특정 템플릿 초기화
        if (templateId === 'frontendTemplate') {
            initFrontendForm(newModalContent, id);
        } else if (templateId === 'featuresTemplate') {
            initFeaturesForm(newModalContent, id);
        } else if (templateId === 'statusTemplate') {
            initStatusPanel(newModalContent, id);
        } else if (templateId === 'terminalTemplate') {
            initTerminal(newModalContent, id);
        } else if (templateId === 'confirmPoweroffTemplate') {
            initConfirmPoweroff(newModalContent, id);
        } else if (templateId === 'encryptWarnTemplate') {
            initEncryptWarnConfirm(newModalContent, id);
        } else if (templateId === 'forwardProxyModalTemplate') {
            initForwardProxyModal(newModalContent, id);
        }
    }

    // 모달 닫기 함수
    function closeModal(windowId) {
        const backdrop = document.getElementById(`modalBackdrop_${windowId}`);
        if (backdrop) {
            backdrop.classList.remove('show');
            // 애니메이션을 위한 setTimeout 사용
            setTimeout(() => {
                backdrop.remove();
                // 창 목록에서 제거
                openWindows = openWindows.filter(win => win.id !== windowId);
                // 창 타입 매핑에서 제거
                for (const [templateId, id] of Object.entries(windowTypes)) {
                    if (id === windowId) {
                        delete windowTypes[templateId];
                        break;
                    }
                }
                updateActivitiesList();
                // 스냅샷도 제거
                removeSnapshot(windowId);
            }, 300); // CSS 애니메이션 시간과 일치시킴
        }
    }

    // 창 최소화 함수
    function minimizeWindow(windowId) {
        const backdrop = document.getElementById(`modalBackdrop_${windowId}`);
        if (backdrop) {
            backdrop.style.display = 'none';
            // 창 객체의 상태 업데이트
            const windowObj = openWindows.find(win => win.id === windowId);
            if (windowObj) {
                windowObj.isMinimized = true;
            }
            updateActivitiesList();
        }
    }

    // 창 최대화/복원 함수
    function toggleMaximizeWindow(windowId) {
        const modal = document.getElementById(`modalWindow_${windowId}`);
        const windowObj = openWindows.find(win => win.id === windowId);
        if (!modal || !windowObj) return;

        if (!windowObj.isMaximized) {
            // 최대화
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.transform = 'none'; // 기존 transform 제거
            windowObj.isMaximized = true;
        } else {
            // 복원
            modal.style.width = '600px';
            modal.style.height = '400px';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            windowObj.isMaximized = false;
        }
        updateActivitiesList();
    }

    // 창 포커스 함수
    function focusWindow(windowId) {
        const backdrop = document.getElementById(`modalBackdrop_${windowId}`);
        if (backdrop) {
            backdrop.style.display = 'flex';
            backdrop.classList.add('show'); // 애니메이션을 위해 show 클래스 추가

            // 창 객체의 상태 업데이트
            const windowObj = openWindows.find(win => win.id === windowId);
            if (windowObj) {
                windowObj.isMinimized = false;
            }

            // 모달을 최상위로 설정
            backdrop.style.zIndex = ++currentZIndex;

            updateActivitiesList();
        }
    }

    // 창 목록 업데이트 함수
    function updateActivitiesList() {
        // 현재는 스냅샷만 관리하므로 별도의 창 목록 업데이트는 필요하지 않음
    }

    // 프록시 모드 UI 업데이트 함수
    function updateUIForMode(mode) {
        if (mode === 'forward') {
            openFrontendModalBtn.style.display = 'none';
            forwardProxyIcon.style.display = 'none'; // 포워드 모드에서 아이콘 숨김
            showProxyStatus();
            disconnectContainer.style.display = 'block';
        } else if (mode === 'reverse') {
            openFrontendModalBtn.style.display = 'block';
            forwardProxyIcon.style.display = 'block'; // 리버스 모드에서 다시 아이콘 표시
            hideProxyStatus();
            disconnectContainer.style.display = 'none';
        }
    }

    function showProxyStatus() {
        proxyStatusMessage.style.display = 'block';
        connectionStartTime = new Date();
        updateConnectionTime();
        connectionTimer = setInterval(updateConnectionTime, 1000);
    }

    function hideProxyStatus() {
        proxyStatusMessage.style.display = 'none';
        if (connectionTimer) {
            clearInterval(connectionTimer);
            connectionTimer = null;
        }
        connectionTimeSpan.textContent = '00:00:00';
    }

    function updateConnectionTime() {
        if (!connectionStartTime) return;
        const now = new Date();
        const elapsed = now - connectionStartTime;
        const totalSeconds = Math.floor(elapsed / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        connectionTimeSpan.textContent = `${hours}:${minutes}:${seconds}`;
    }

    // 연결 해제 버튼 이벤트 리스너
    disconnectButton.addEventListener('click', async () => {
        try {
            const response = await fetch('https://localhost:5000/set-mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'reverse' }),
            });
            const result = await response.json();
            alert(result.message);
            updateUIForMode('reverse');
        } catch (error) {
            console.error('Reverse 모드 전환 실패:', error);
            alert('연결 해제에 실패했습니다. 다시 시도해 주세요.');
        }
    });

    // 시스템 종료 확인 모달 초기화
    function initConfirmPoweroff(modalContent, windowId) {
        const yesBtn = modalContent.querySelector('#confirmYesBtn');
        const noBtn = modalContent.querySelector('#confirmNoBtn');

        if (yesBtn && noBtn) {
            yesBtn.addEventListener('click', async () => {
                try {
                    const res = await fetch('https://localhost:5000/poweroff', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await res.json();
                    appendTerminalLog(data.message);
                    closeModal(windowId); // 모달 닫기
                    window.electronAPI.poweroff();
                } catch (error) {
                    console.error('Poweroff failed:', error);
                    appendTerminalLog('파워 오프에 실패했습니다.');
                }
            });

            noBtn.addEventListener('click', () => {
                closeModal(windowId);
            });
        }
    }

    // 경고 모달 초기화
    function initEncryptWarnConfirm(modalContent, windowId, callback) {
        const yesBtn = modalContent.querySelector('#encryptYesBtn');
        const noBtn = modalContent.querySelector('#encryptNoBtn');

        if (yesBtn && noBtn) {
            yesBtn.addEventListener('click', () => {
                closeModal(windowId);
                callback(true);
            });
            noBtn.addEventListener('click', () => {
                closeModal(windowId);
                callback(false);
            });
        }
    }

    // 포워드 프록시 모달 초기화
    function initForwardProxyModal(modalContent, windowId) {
        const allowBtn = modalContent.querySelector('#forwardAllowBtn');
        const cancelBtn = modalContent.querySelector('#forwardCancelBtn');

        if (allowBtn && cancelBtn) {
            allowBtn.addEventListener('click', async () => {
                try {
                    const res = await fetch('https://localhost:5000/set-mode', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ mode: 'forward' })
                    });
                    const data = await res.json();
                    alert(data.message);
                    closeModal(windowId); // 모달 닫기 후 상태 업데이트
                    updateUIForMode('forward');

                    window.electronAPI.runPACSetup();
                } catch (error) {
                    console.error('Forward 모드 전환 실패:', error);
                    alert('Forward 모드 전환에 실패했습니다.');
                }
            });

            cancelBtn.addEventListener('click', () => {
                closeModal(windowId);
            });
        }
    }

    // 기능 활성화 모달 초기화
    function initFeaturesForm(modalContent, windowId) {
        const checkboxes = modalContent.querySelectorAll('.features-grid input[type="checkbox"]');
        checkboxes.forEach((checkbox) => {
            checkbox.checked = false; // 초기 상태 설정 (서버에서 가져올 경우 이 부분을 수정 필요)
            checkbox.addEventListener('change', async () => {
                const feature = checkbox.name;
                const enabled = checkbox.checked;

                if (feature === 'encrypt' && enabled === true) {
                    // 암호화 활성화 시 경고 모달 열기
                    createWindow('경고', 'encryptWarnTemplate', windowId);
                    const confirmCallback = async (confirm) => {
                        if (confirm) {
                            await toggleFeature(windowId, feature, true);
                        } else {
                            // 암호화 비활성화
                            checkbox.checked = false;
                            await toggleFeature(windowId, feature, false);
                        }
                    };
                    // encryptWarnTemplate 초기화
                    const encryptWarnBackdrop = document.getElementById(`modalBackdrop_encryptWarnTemplate_${windowId}`);
                    if (encryptWarnBackdrop) {
                        const encryptWarnModalContent = encryptWarnBackdrop.querySelector('.modal-content');
                        initEncryptWarnConfirm(encryptWarnModalContent, `encryptWarnTemplate_${windowId}`, confirmCallback);
                    }
                } else {
                    await toggleFeature(windowId, feature, enabled);
                }
            });
        });

        // 서버에서 현재 기능 상태 가져오기 및 설정
        fetch('https://localhost:5000/features', {
            headers: { 'Content-Type': 'application/json' }
        })
        .then(res => res.json())
        .then(featuresData => {
            checkboxes.forEach((checkbox) => {
                checkbox.checked = !!featuresData[checkbox.name];
            });
        })
        .catch(error => {
            console.error('Failed to fetch features:', error);
            appendTerminalLog('기능을 가져오는 데 실패했습니다.');
        });
    }

    // 프론트엔드 URL 등록 모달 초기화
    function initFrontendForm(modalContent, windowId) {
        const frontendForm = modalContent.querySelector('#frontendForm');
        if (frontendForm) {
            frontendForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const frontendUrl = modalContent.querySelector('#frontendUrl').value;
                try {
                    const response = await fetch('https://localhost:5000/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ frontendUrl }),
                    });
                    const result = await response.json();
                    alert(result.message);
                    appendTerminalLog(result.message);
                    closeModal(windowId); // URL 등록 후 모달 닫기 -> 터미널 입력 가능해짐
                } catch (error) {
                    console.error('Failed to register frontend URL:', error);
                    appendTerminalLog('프론트엔드 URL 등록에 실패했습니다.');
                }
            });
        }
    }

    // 상태 패널 모달 초기화
    function initStatusPanel(modalContent, windowId) {
        // 상태 패널 업데이트
        updateStatusPanel(modalContent, windowId);
    }

    function updateStatusPanel(modalContent, windowId) {
        fetch('https://localhost:5000/status', {
            headers: { 'Content-Type': 'application/json' }
        })
        .then(res => res.json())
        .then(statusData => {
            fetch('https://localhost:5000/features', {
                headers: { 'Content-Type': 'application/json' }
            })
            .then(res => res.json())
            .then(featuresData => {
                const apiStatus = modalContent.querySelector('#apiStatusValue');
                const encryptStatus = modalContent.querySelector('#encryptStatus');
                const dataEncryptStatus = modalContent.querySelector('#dataEncryptStatus');
                const fileEncryptStatus = modalContent.querySelector('#fileEncryptStatus');
                const distributionStatus = modalContent.querySelector('#distributionStatus');
                const anonymityStatus = modalContent.querySelector('#anonymityStatus');

                if (apiStatus) apiStatus.textContent = statusData.mode === 'forward' ? '포워드 프록시 (ON)' : '리버스 프록시 (OFF)';
                if (encryptStatus) encryptStatus.textContent = featuresData.encrypt ? 'ON' : 'OFF';
                if (dataEncryptStatus) dataEncryptStatus.textContent = featuresData.dataEncrypt ? 'ON' : 'OFF';
                if (fileEncryptStatus) fileEncryptStatus.textContent = featuresData.fileEncrypt ? 'ON' : 'OFF';
                if (distributionStatus) distributionStatus.textContent = featuresData.randomDistribution ? 'ON' : 'OFF';
                if (anonymityStatus) anonymityStatus.textContent = featuresData.anonymity ? 'ON' : 'OFF';
            })
            .catch(error => {
                console.error('Failed to fetch features for status panel:', error);
                appendTerminalLog('상태 패널을 업데이트하는 데 실패했습니다.');
            });
        })
        .catch(error => {
            console.error('Failed to fetch status:', error);
            appendTerminalLog('상태를 가져오는 데 실패했습니다.');
        });
    }

    // 터미널 모달 초기화
    function initTerminal(modalContent, windowId) {
        const terminalOutput = modalContent.querySelector('#terminalOutput');
        const terminalInput = modalContent.querySelector('#terminalInput');
        let terminalBuffer = [];

        // 초기 로그 처리
        function appendTerminalOutput(text) {
            const line = document.createElement('div');
            line.textContent = text;
            terminalOutput.appendChild(line);
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        }

        function appendTerminalLog(msg) {
            if (terminalOutput) {
                appendTerminalOutput(msg);
            } else {
                terminalBuffer.push(msg);
            }
        }

        // 버퍼에 있는 로그를 출력
        while (terminalBuffer.length > 0) {
            appendTerminalOutput(terminalBuffer.shift());
        }

        if (terminalInput) {
            terminalInput.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    const command = terminalInput.value.trim();
                    if (!command) return;
                    appendTerminalOutput(`> ${command}`);
                    try {
                        const commandRes = await fetch('https://localhost:5000/command', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ command }),
                        });
                        const commandData = await commandRes.json();
                        appendTerminalOutput(commandData.output);
                        terminalInput.value = '';

                        if (command === 'poweroff') {
                            const offRes = await fetch('https://localhost:5000/poweroff', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                            });
                            const offData = await offRes.json();
                            appendTerminalLog(offData.message);
                            closeModal(windowId); // 파워오프 전 모달 닫기
                            window.electronAPI.poweroff();
                        }
                    } catch (error) {
                        console.error('Command execution failed:', error);
                        appendTerminalOutput('명령어 실행에 실패했습니다.');
                    }
                }
            });
        }
    }

    // 터미널 로그 추가 함수
    function appendTerminalLog(msg) {
        const terminalOutput = document.querySelector('#terminalOutput');
        if (terminalOutput) {
            const line = document.createElement('div');
            line.textContent = msg;
            terminalOutput.appendChild(line);
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        }
    }

    // 기능 토글 함수
    async function toggleFeature(windowId, feature, enabled) {
        try {
            const res = await fetch('https://localhost:5000/toggle-feature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature, enabled }),
            });
            const result = await res.json();
            alert(result.message);
            appendTerminalLog(result.message);
            closeModal(windowId); // 기능 모달 닫기
            // 창을 다시 열어서 업데이트
            createWindow('기능 활성화', 'featuresTemplate', 'openFeaturesModal'); 
        } catch (error) {
            console.error(`Failed to toggle feature ${feature}:`, error);
            appendTerminalLog(`기능 토글에 실패했습니다: ${feature}`);
        }
    }

    // 시스템 모드 초기화 함수
    async function initializeMode() {
        try {
            const response = await fetch('https://localhost:5000/status', {
                headers: { 'Content-Type': 'application/json' }
            });
            const statusData = await response.json();
            updateUIForMode(statusData.mode);
        } catch (error) {
            console.error('초기 모드 로드 실패:', error);
        }
    }

    initializeMode();

    // 주기적으로 상태 업데이트
    setInterval(() => {
        openWindows.forEach(win => {
            if (win.templateId === 'statusTemplate') {
                const backdrop = document.getElementById(`modalBackdrop_${win.id}`);
                if (backdrop) {
                    const modalContent = backdrop.querySelector('.modal-content');
                    if (modalContent) {
                        updateStatusPanel(modalContent, win.id);
                    }
                }
            }
        });
    }, 5000);

    // Electron API 이벤트 리스너
    if (window.electronAPI) {
        window.electronAPI.onModeChanged((mode) => {
            console.log(`Mode changed to: ${mode}`);
            updateUIForMode(mode);
        });

        window.electronAPI.onPACSetupDone((data) => {
            if (data.success) {
                console.log('PAC 자동 설정 완료:', data.message);
            } else {
                console.error('PAC 자동 설정 실패:', data.message);
                alert('PAC 자동 설정 실패: ' + data.message);
            }
        });
    }

    // 이벤트 리스너 등록
    openFrontendModalBtn.addEventListener('click', () => {
        createWindow('프론트엔드 URL 등록', 'frontendTemplate', 'openFrontendModal');
    });

    openFeaturesModalBtn.addEventListener('click', () => {
        createWindow('기능 활성화', 'featuresTemplate', 'openFeaturesModal');
    });

    openStatusModalBtn.addEventListener('click', () => {
        createWindow('상태 패널', 'statusTemplate', 'openStatusModal');
    });

    openTerminalModalBtn.addEventListener('click', () => {
        createWindow('터미널', 'terminalTemplate', 'openTerminalModal');
    });

    forwardProxyIcon.addEventListener('click', () => {
        createWindow('포워드 프록시 설정', 'forwardProxyModalTemplate', 'forwardProxyIcon');
    });

    powerOffBtn.addEventListener('click', () => {
        createWindow('시스템 종료', 'confirmPoweroffTemplate', 'powerOffBtn');
    });

    // 모달 드래그 및 리사이즈 함수
    function initModalDragging(modalElement, backdropElement, windowId) {
        let isDragging = false;
        let dragStartX, dragStartY;
        let originalX, originalY;

        const modalHeader = modalElement.querySelector('.modal-header');

        modalHeader.addEventListener('mousedown', (e) => {
            // 창 제어 버튼 클릭 시 드래그 방지
            if (e.target.closest('.window-controls')) return;

            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            const rect = modalElement.getBoundingClientRect();
            originalX = rect.left;
            originalY = rect.top;
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', onDragEnd);
        });

        function onDrag(e) {
            if (!isDragging) return;
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            modalElement.style.left = `${originalX + dx}px`;
            modalElement.style.top = `${originalY + dy}px`;
            modalElement.style.transform = 'none'; // 기존 transform 제거
        }

        function onDragEnd(e) {
            if (!isDragging) return;
            isDragging = false;
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', onDragEnd);
        }

        // 리사이즈 기능
        let isResizing = false;
        let resizeStartX, resizeStartY;
        let initialWidth, initialHeight;

        const resizeHandle = modalElement.querySelector('.modal-resize-handle');

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            const rect = modalElement.getBoundingClientRect();
            initialWidth = rect.width;
            initialHeight = rect.height;
            document.addEventListener('mousemove', onResize);
            document.addEventListener('mouseup', onResizeEnd);
            e.stopPropagation(); // 드래그 이벤트 전파 방지
        });

        function onResize(e) {
            if (!isResizing) return;
            const dx = e.clientX - resizeStartX;
            const dy = e.clientY - resizeStartY;
            modalElement.style.width = `${initialWidth + dx}px`;
            modalElement.style.height = `${initialHeight + dy}px`;
        }

        function onResizeEnd(e) {
            if (!isResizing) return;
            isResizing = false;
            document.removeEventListener('mousemove', onResize);
            document.removeEventListener('mouseup', onResizeEnd);
        }
    }

    // 시스템 종료 시 모든 스냅샷 삭제
    window.addEventListener('beforeunload', () => {
        snapshotContainer.innerHTML = '';
    });
});
