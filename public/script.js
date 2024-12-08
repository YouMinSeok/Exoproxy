document.addEventListener('DOMContentLoaded', () => {
    const openFrontendModalBtn = document.getElementById('openFrontendModal');
    const openFeaturesModalBtn = document.getElementById('openFeaturesModal');
    const openStatusModalBtn = document.getElementById('openStatusModal');
    const openTerminalModalBtn = document.getElementById('openTerminalModal');
    const forwardProxyIcon = document.getElementById('forwardProxyIcon');
    const powerOffBtn = document.getElementById('powerOffBtn');

    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalWindow = document.getElementById('modalWindow');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const closeModalBtn = document.getElementById('closeModalBtn');

    const disconnectContainer = document.getElementById('disconnectContainer');
    const disconnectButton = document.getElementById('disconnectButton');

    let terminalOutput, terminalInput;
    let terminalOpen = false;
    let terminalBuffer = [];

    const proxyStatusMessage = document.getElementById('proxyStatusMessage');
    const connectionTimeSpan = document.getElementById('connectionTime');
    let connectionStartTime = null;
    let connectionTimer = null;

    function appendTerminalLog(msg) {
        if (terminalOpen && terminalOutput) {
            appendTerminalOutput(msg);
        } else {
            terminalBuffer.push(msg);
        }
    }

    // UI 모드 업데이트: Forward 모드일 때 forwardProxyIcon 숨기기, Reverse 모드일 때 보이기
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

    openFrontendModalBtn.addEventListener('click', () => {
        openModal('프론트엔드 URL 등록', 'frontendTemplate');
    });
    openFeaturesModalBtn.addEventListener('click', () => {
        openModal('기능 활성화', 'featuresTemplate');
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

    forwardProxyIcon.addEventListener('click', () => {
        openModal('포워드 프록시 서버 실행', 'forwardProxyModalTemplate');
    });

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

    function initConfirmPoweroff() {
        const yesBtn = modalContent.querySelector('#confirmYesBtn');
        const noBtn = modalContent.querySelector('#confirmNoBtn');

        yesBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('https://localhost:5000/poweroff', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                appendTerminalLog(data.message);
                closeModal(); // 모달 닫기
                window.electronAPI.poweroff();
            } catch (error) {
                console.error('Poweroff failed:', error);
                appendTerminalLog('파워 오프에 실패했습니다.');
            }
        });

        noBtn.addEventListener('click', () => {
            closeModal();
        });
    }

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

    function initForwardProxyModal() {
        const allowBtn = modalContent.querySelector('#forwardAllowBtn');
        const cancelBtn = modalContent.querySelector('#forwardCancelBtn');

        allowBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('https://localhost:5000/set-mode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: 'forward' })
                });
                const data = await res.json();
                alert(data.message);
                closeModal(); // 모달 닫기 후 터미널 사용가능
                updateUIForMode('forward');

                window.electronAPI.runPACSetup();
            } catch (error) {
                console.error('Forward 모드 전환 실패:', error);
                alert('Forward 모드 전환에 실패했습니다.');
            }
        });

        cancelBtn.addEventListener('click', () => {
            closeModal();
        });
    }

    async function toggleFeature(feature, enabled) {
        try {
            const res = await fetch('https://localhost:5000/toggle-feature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature, enabled }),
            });
            const result = await res.json();
            alert(result.message);
            appendTerminalLog(result.message);
            closeModal(); // 기능 모달 닫기
            openModal('기능 활성화', 'featuresTemplate'); // 다시 열어도 되지만 필요없다면 제거 가능
            updateFeaturesState();
        } catch (error) {
            console.error(`Failed to toggle feature ${feature}:`, error);
            appendTerminalLog(`기능 토글에 실패했습니다: ${feature}`);
        }
    }

    async function updateFeaturesState() {
        try {
            const featuresRes = await fetch('https://localhost:5000/features', {
                headers: { 'Content-Type': 'application/json' }
            });
            const featuresData = await featuresRes.json();
            const checkboxes = modalContent.querySelectorAll('.features-grid input[type="checkbox"]');
            checkboxes.forEach((checkbox) => {
                checkbox.checked = !!featuresData[checkbox.name];
                checkbox.onchange = async () => {
                    const feature = checkbox.name;
                    const enabled = checkbox.checked;

                    if (feature === 'encrypt' && enabled === true) {
                        openModal('경고', 'encryptWarnTemplate');
                    } else {
                        // 토글 후 모달 닫기/열기 상태 확인 필요
                        await toggleFeature(feature, enabled);
                    }
                };
            });
        } catch (error) {
            console.error('Failed to update features state:', error);
            appendTerminalLog('기능 상태 업데이트에 실패했습니다.');
        }
    }

    function initFeaturesForm() {
        updateFeaturesState();
    }

    function initFrontendForm() {
        const frontendForm = modalContent.querySelector('#frontendForm');
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
                closeModal(); // URL 등록 후 모달 닫기 -> 터미널 입력 가능해짐
            } catch (error) {
                console.error('Failed to register frontend URL:', error);
                appendTerminalLog('프론트엔드 URL 등록에 실패했습니다.');
            }
        });
    }

    async function updateStatus() {
        try {
            const statusRes = await fetch('https://localhost:5000/status', {
                headers: { 'Content-Type': 'application/json' }
            });
            const statusData = await statusRes.json();
            const featuresRes = await fetch('https://localhost:5000/features', {
                headers: { 'Content-Type': 'application/json' }
            });
            const featuresData = await featuresRes.json();

            if (modalContent.querySelector('#apiStatusValue')) {
                modalContent.querySelector('#apiStatusValue').textContent = statusData.mode === 'forward' ? '포워드 프록시 (ON)' : '리버스 프록시 (OFF)';
                modalContent.querySelector('#encryptStatus').textContent = featuresData.encrypt ? 'ON' : 'OFF';
                modalContent.querySelector('#dataEncryptStatus').textContent = featuresData.dataEncrypt ? 'ON' : 'OFF';
                modalContent.querySelector('#fileEncryptStatus').textContent = featuresData.fileEncrypt ? 'ON' : 'OFF';
                modalContent.querySelector('#distributionStatus').textContent = featuresData.randomDistribution ? 'ON' : 'OFF';
                modalContent.querySelector('#anonymityStatus').textContent = featuresData.anonymity ? 'ON' : 'OFF';
            }
        } catch (error) {
            console.error('Failed to update status:', error);
            appendTerminalLog('상태 패널 업데이트에 실패했습니다.');
        }
    }

    function initTerminal() {
        terminalOutput = modalContent.querySelector('#terminalOutput');
        terminalInput = modalContent.querySelector('#terminalInput');
        terminalOpen = true;

        while (terminalBuffer.length > 0) {
            appendTerminalOutput(terminalBuffer.shift());
        }

        terminalInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                const command = terminalInput.value.trim();
                if (!command) return;
                try {
                    appendTerminalOutput(`> ${command}`);
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
                        closeModal(); // 파워오프 전 모달 닫기
                        window.electronAPI.poweroff();
                    }
                } catch (error) {
                    console.error('Command execution failed:', error);
                    appendTerminalOutput('명령어 실행에 실패했습니다.');
                }
            }
        });
    }

    function appendTerminalOutput(text) {
        const line = document.createElement('div');
        line.textContent = text;
        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    function openModal(title, templateId) {
        modalTitle.textContent = title;
        modalContent.innerHTML = '';
        const tmpl = document.getElementById(templateId);
        const clone = document.importNode(tmpl.content, true);
        modalContent.appendChild(clone);
        modalBackdrop.style.display = 'flex';
        // 모달이 열리면 터미널 입력 불가 -> 모달 닫기 필수

        if (templateId === 'frontendTemplate') {
            initFrontendForm();
        } else if (templateId === 'featuresTemplate') {
            initFeaturesForm();
            updateFeaturesState();
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
                    closeModal(); 
                    openModal('기능 활성화', 'featuresTemplate');
                    updateFeaturesState();
                }
            });
        } else if (templateId === 'forwardProxyModalTemplate') {
            initForwardProxyModal();
        }
    }

    function closeModal() {
        modalBackdrop.style.display = 'none';
        modalTitle.textContent = '';
        modalContent.innerHTML = '';
    }

    closeModalBtn.addEventListener('click', closeModal);

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

    setInterval(() => {
        if (modalContent.querySelector('#apiStatusValue')) {
            updateStatus();
        }
    }, 5000);

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
});
