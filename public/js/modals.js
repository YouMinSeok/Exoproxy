// public/js/modals.js

import { appendTerminalLog, removeSnapshot } from './utils.js';

/**
 * 모달 초기화 함수
 */
export function initModals() {
    const openModalListeners = {
        frontendTemplate: initFrontendForm,
        featuresTemplate: initFeaturesForm,
        statusTemplate: initStatusPanel,
        terminalTemplate: initTerminal,
        confirmPoweroffTemplate: initConfirmPoweroff,
        encryptWarnTemplate: initEncryptWarnConfirm,
        forwardProxyModalTemplate: initForwardProxyModal,
        connectionProgressTemplate: initConnectionProgressModal // 추가
    };

    // 'openModal' 이벤트 리스너 등록
    document.addEventListener('openModal', (e) => {
        const { templateId } = e.detail;
        createModal(templateId);
    });

    // 초기화 시 현재 모드를 가져와 UI를 설정
    initializeUI();

    /**
     * 모달 생성 함수
     * @param {string} templateId - 모달 템플릿 ID
     */
    function createModal(templateId) {
        console.log(`Attempting to open modal for templateId: ${templateId}`);
        
        // 이미 해당 템플릿의 모달이 열려 있는지 확인
        const existingBackdrop = Array.from(document.getElementsByClassName('modal-backdrop')).find(backdrop => {
            return backdrop.getAttribute('data-template-id') === templateId;
        });
        if (existingBackdrop) {
            console.warn(`Modal for templateId: ${templateId} is already open.`);
            return;
        }

        const windowId = `window_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const titleMap = {
            frontendTemplate: '프론트엔드 URL 등록',
            featuresTemplate: '기능 활성화',
            statusTemplate: '상태 패널',
            terminalTemplate: '터미널',
            confirmPoweroffTemplate: '시스템 종료',
            encryptWarnTemplate: '경고',
            forwardProxyModalTemplate: '포워드 프록시 설정',
            connectionProgressTemplate: '연결 진행 중' // 추가
        };
        const title = titleMap[templateId] || '모달 창';

        // 모달 백드롭 생성
        const modalBackdrop = document.createElement('div');
        modalBackdrop.classList.add('modal-backdrop');
        modalBackdrop.id = `modalBackdrop_${windowId}`;
        modalBackdrop.style.display = 'flex';
        modalBackdrop.setAttribute('data-template-id', templateId); // 템플릿 ID 설정

        // 모달 창 생성
        const modal = document.createElement('div');
        modal.classList.add('modal');
        modal.id = `modalWindow_${windowId}`;
        modal.style.zIndex = getMaxZIndex() + 1;

        // 모달 헤더 생성
        const modalHeader = document.createElement('div');
        modalHeader.classList.add('modal-header');

        const modalTitle = document.createElement('h2');
        modalTitle.textContent = title;

        // 특정 템플릿일 경우 창 제어 버튼 생략
        if (templateId !== 'connectionProgressTemplate') {
            // 창 제어 버튼 (최소화, 최대화, 닫기)
            const windowControls = document.createElement('div');
            windowControls.classList.add('window-controls');

            const minimizeBtn = document.createElement('button');
            minimizeBtn.classList.add('minimize-btn');
            minimizeBtn.innerHTML = '_';
            minimizeBtn.title = '창 최소화';
            minimizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                captureSnapshot(windowId);
                minimizeWindow(windowId);
            });

            const maximizeBtn = document.createElement('button');
            maximizeBtn.classList.add('maximize-btn');
            maximizeBtn.innerHTML = '&#x26F6;';
            maximizeBtn.title = '창 최대화';
            maximizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleMaximizeWindow(windowId);
            });

            const closeBtn = document.createElement('button');
            closeBtn.classList.add('close-btn');
            closeBtn.innerHTML = '&times;';
            closeBtn.title = '창 닫기';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeModal(windowId);
            });

            windowControls.appendChild(minimizeBtn);
            windowControls.appendChild(maximizeBtn);
            windowControls.appendChild(closeBtn);

            modalHeader.appendChild(modalTitle);
            modalHeader.appendChild(windowControls);
        } else {
            // 진행 상태 모달에는 창 제어 버튼 없음
            modalHeader.appendChild(modalTitle);
        }

        // 모달 콘텐츠 생성
        const modalContent = document.createElement('div');
        modalContent.classList.add('modal-content');

        const templateElement = document.getElementById(templateId);
        if (templateElement) {
            const clone = document.importNode(templateElement.content, true);
            modalContent.appendChild(clone);
        } else {
            console.error(`Template with ID ${templateId} not found.`);
            return;
        }

        // 리사이즈 핸들 생성 (진행 상태 모달에는 필요 없음)
        if (templateId !== 'connectionProgressTemplate') {
            const resizeHandle = document.createElement('div');
            resizeHandle.classList.add('modal-resize-handle');
            modal.appendChild(resizeHandle);
        }

        // 모달 구조 조립
        modal.appendChild(modalHeader);
        modal.appendChild(modalContent);
        modalBackdrop.appendChild(modal);
        document.body.appendChild(modalBackdrop);

        // 애니메이션을 위해 show 클래스 추가
        setTimeout(() => {
            modalBackdrop.classList.add('show');
        }, 10);

        // 드래그 및 리사이즈 초기화 (진행 상태 모달에는 리사이즈 필요 없음)
        if (templateId !== 'connectionProgressTemplate') {
            initModalDragging(modal, modalBackdrop, windowId);
        }

        // 특정 템플릿 초기화
        if (openModalListeners[templateId]) {
            openModalListeners[templateId](modalContent, windowId);
        }
    }

    /**
     * Z-Index 최댓값 계산 함수
     * @returns {number} 최댓값 z-index
     */
    function getMaxZIndex() {
        const elements = document.getElementsByTagName('*');
        let max = 0;
        for (let i = 0; i < elements.length; i++) {
            const z = parseInt(window.getComputedStyle(elements[i]).zIndex, 10);
            if (!isNaN(z) && z > max) max = z;
        }
        return max;
    }

    /**
     * 모달 닫기 함수
     * @param {string} windowId - 모달 창 ID
     */
    function closeModal(windowId) {
        const backdrop = document.getElementById(`modalBackdrop_${windowId}`);
        if (backdrop) {
            backdrop.classList.remove('show');
            backdrop.addEventListener('transitionend', () => {
                backdrop.remove(); // 모달 백드롭 완전 제거
                removeSnapshot(windowId);
            }, { once: true });
        }
    }

    /**
     * 창 최소화 함수
     * @param {string} windowId - 모달 창 ID
     */
    function minimizeWindow(windowId) {
        const backdrop = document.getElementById(`modalBackdrop_${windowId}`);
        if (backdrop) {
            backdrop.style.display = 'none';
        }
    }

    /**
     * 창 최대화/복원 함수
     * @param {string} windowId - 모달 창 ID
     */
    function toggleMaximizeWindow(windowId) {
        const modal = document.getElementById(`modalWindow_${windowId}`);
        if (!modal) return;

        if (!modal.classList.contains('maximized')) {
            // 최대화
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.transform = 'none';
            modal.classList.add('maximized');
        } else {
            // 복원
            modal.style.width = '600px';
            modal.style.height = '400px';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.classList.remove('maximized');
        }
    }

    /**
     * 드래그 및 리사이즈 초기화 함수
     * @param {HTMLElement} modalElement - 모달 요소
     * @param {HTMLElement} backdropElement - 백드롭 요소
     * @param {string} windowId - 모달 창 ID
     */
    function initModalDragging(modalElement, backdropElement, windowId) {
        let isDragging = false;
        let dragStartX, dragStartY;
        let originalX, originalY;

        const modalHeader = modalElement.querySelector('.modal-header');

        modalHeader.addEventListener('mousedown', (e) => {
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
            modalElement.style.transform = 'none';
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

        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', (e) => {
                isResizing = true;
                resizeStartX = e.clientX;
                resizeStartY = e.clientY;
                const rect = modalElement.getBoundingClientRect();
                initialWidth = rect.width;
                initialHeight = rect.height;
                document.addEventListener('mousemove', onResize);
                document.addEventListener('mouseup', onResizeEnd);
                e.stopPropagation();
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
    }

    /**
     * 프론트엔드 URL 등록 모달 초기화 함수
     * @param {HTMLElement} modalContent - 모달 콘텐츠 요소
     * @param {string} windowId - 모달 창 ID
     */
    function initFrontendForm(modalContent, windowId) {
        const frontendForm = modalContent.querySelector('#frontendForm');
        if (frontendForm) {
            frontendForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const frontendUrl = modalContent.querySelector('#frontendUrl').value.trim();
                if (!frontendUrl) {
                    appendTerminalLog('URL을 입력해주세요.');
                    return;
                }

                // 진행 상태 모달 열기
                const progressEvent = new CustomEvent('openModal', { detail: { templateId: 'connectionProgressTemplate' } });
                document.dispatchEvent(progressEvent);

                // 진행 상태 모달 ID 저장
                const progressBackdrop = Array.from(document.getElementsByClassName('modal-backdrop')).find(backdrop => {
                    return backdrop.getAttribute('data-template-id') === 'connectionProgressTemplate';
                });
                const progressWindowId = progressBackdrop ? progressBackdrop.id.replace('modalBackdrop_', '') : null;

                // 진행 바 애니메이션을 위한 Promise
                const progressPromise = new Promise((resolve) => {
                    let progress = 0;
                    const progressFill = progressBackdrop.querySelector('.progress-fill');
                    const progressMessage = progressBackdrop.querySelector('.progress-message');

                    const progressInterval = setInterval(() => {
                        progress += 10;
                        if (progressFill) {
                            progressFill.style.width = `${progress}%`;
                        }
                        if (progress >= 100) {
                            clearInterval(progressInterval);
                            resolve();
                        }
                    }, 300); // 0.3초마다 10% 증가
                });

                // 서버 요청을 위한 Promise
                const serverRequestPromise = new Promise(async (resolve) => {
                    try {
                        const response = await fetch('https://localhost:5000/register', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ frontendUrl }),
                        });

                        const result = await response.json();

                        // 서버 응답에 따른 진행 상태 모달 메시지 업데이트
                        if (progressBackdrop) {
                            const progressFill = progressBackdrop.querySelector('.progress-fill');
                            const progressMessage = progressBackdrop.querySelector('.progress-message');
                            if (result.success) {
                                if (progressMessage) {
                                    progressMessage.textContent = '연결 성공!';
                                    progressFill.style.backgroundColor = '#2ecc71';
                                }
                            } else {
                                if (progressMessage) {
                                    progressMessage.textContent = `연결 실패: ${result.message}`;
                                    progressFill.style.backgroundColor = '#e74c3c';
                                }
                            }
                        }

                        resolve(result);
                    } catch (error) {
                        console.error('Failed to register frontend URL:', error);
                        appendTerminalLog('프론트엔드 URL 등록에 실패했습니다.');

                        if (progressBackdrop) {
                            const progressFill = progressBackdrop.querySelector('.progress-fill');
                            const progressMessage = progressBackdrop.querySelector('.progress-message');
                            if (progressMessage) {
                                progressMessage.textContent = '연결 실패: 네트워크 오류';
                                progressFill.style.backgroundColor = '#e74c3c';
                            }
                        }

                        resolve({ success: false, message: '네트워크 오류' });
                    }
                });

                // 두 Promise가 모두 완료될 때까지 대기
                await Promise.all([progressPromise, serverRequestPromise]).then(([_, serverResult]) => {
                    // 1초 후에 모달 닫기
                    setTimeout(() => {
                        closeModal(progressWindowId);
                        if (serverResult.success) {
                            appendTerminalLog(`프론트엔드 URL이 성공적으로 등록되었습니다: ${frontendUrl}`);
                            console.log('프론트엔드 URL 등록 성공:', serverResult.message);
                            closeModal(windowId); // 프론트엔드 URL 등록 모달 닫기
                        } else {
                            appendTerminalLog(`프론트엔드 URL 등록에 실패했습니다: ${serverResult.message}`);
                            console.error('프론트엔드 URL 등록 실패:', serverResult.message);
                        }
                    }, 1000);
                });
            });
        }
    }

    /**
     * 기능 활성화 모달 초기화 함수
     * @param {HTMLElement} modalContent - 모달 콘텐츠 요소
     * @param {string} windowId - 모달 창 ID
     */
    function initFeaturesForm(modalContent, windowId) {
        const checkboxes = modalContent.querySelectorAll('.features-grid input[type="checkbox"]');

        // 기존 이벤트 리스너 제거 (예방책)
        checkboxes.forEach((checkbox) => {
            checkbox.checked = false; // 초기 상태 설정 (서버에서 가져올 경우 이 부분을 수정 필요)
            checkbox.removeEventListener('change', handleCheckboxChange);
            checkbox.addEventListener('change', handleCheckboxChange);
        });

        /**
         * 체크박스 변경 핸들러
         */
        function handleCheckboxChange() {
            const feature = this.name;
            const enabled = this.checked;

            if (feature === 'encrypt' && enabled === true) {
                // 암호화 활성화 시 경고 모달 열기
                const customEvent = new CustomEvent('openModal', { detail: { templateId: 'encryptWarnTemplate' } });
                document.dispatchEvent(customEvent);
            } else {
                toggleFeature(feature, enabled);
            }
        }

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

        // 암호화 경고 응답 처리
        document.addEventListener('encryptConfirmed', async (e) => {
            const { confirm } = e.detail;
            if (confirm) {
                await toggleFeature('encrypt', true);
            } else {
                await toggleFeature('encrypt', false);
                // 체크박스 상태 되돌리기
                const encryptCheckbox = modalContent.querySelector('input[name="encrypt"]');
                if (encryptCheckbox) {
                    encryptCheckbox.checked = false;
                }
            }
        }, { once: true });
    }

    /**
     * 상태 패널 모달 초기화 함수
     * @param {HTMLElement} modalContent - 모달 콘텐츠 요소
     * @param {string} windowId - 모달 창 ID
     */
    function initStatusPanel(modalContent, windowId) {
        updateStatusPanel(modalContent, windowId);
    }

    /**
     * 상태 패널 업데이트 함수
     * @param {HTMLElement} modalContent - 모달 콘텐츠 요소
     * @param {string} windowId - 모달 창 ID
     */
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

    /**
     * 터미널 모달 초기화 함수
     * @param {HTMLElement} modalContent - 모달 콘텐츠 요소
     * @param {string} windowId - 모달 창 ID
     */
    function initTerminal(modalContent, windowId) {
        const terminalOutput = modalContent.querySelector('#terminalOutput');
        const terminalInput = modalContent.querySelector('#terminalInput');

        /**
         * 터미널 출력 추가 함수
         * @param {string} text - 출력할 텍스트
         */
        function appendTerminalOutput(text) {
            const line = document.createElement('div');
            line.textContent = text;
            terminalOutput.appendChild(line);
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        }

        /**
         * 명령어 처리 함수
         * @param {string} command - 입력된 명령어
         */
        function handleCommand(command) {
            appendTerminalOutput(`> ${command}`);
            // 명령어 처리 로직 추가
        }

        terminalInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                const command = terminalInput.value.trim();
                if (!command) return;
                handleCommand(command);
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
                        closeModal(windowId);
                        window.electronAPI.poweroff();
                    }
                } catch (error) {
                    console.error('Command execution failed:', error);
                    appendTerminalOutput('명령어 실행에 실패했습니다.');
                }
            }
        });
    }

    /**
     * 시스템 종료 확인 모달 초기화 함수
     * @param {HTMLElement} modalContent - 모달 콘텐츠 요소
     * @param {string} windowId - 모달 창 ID
     */
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
                    console.log('시스템 종료 응답:', data.message); // 디버깅 로그 추가
                    closeModal(windowId);
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

    /**
     * 암호화 경고 확인 모달 초기화 함수
     * @param {HTMLElement} modalContent - 모달 콘텐츠 요소
     * @param {string} windowId - 모달 창 ID
     */
    function initEncryptWarnConfirm(modalContent, windowId) {
        const yesBtn = modalContent.querySelector('#encryptYesBtn');
        const noBtn = modalContent.querySelector('#encryptNoBtn');

        if (yesBtn && noBtn) {
            yesBtn.addEventListener('click', () => {
                closeModal(windowId);
                // 암호화 활성화
                const customEvent = new CustomEvent('encryptConfirmed', { detail: { confirm: true } });
                document.dispatchEvent(customEvent);
            });
            noBtn.addEventListener('click', () => {
                closeModal(windowId);
                // 암호화 비활성화
                const customEvent = new CustomEvent('encryptConfirmed', { detail: { confirm: false } });
                document.dispatchEvent(customEvent);
            });
        }
    }

    /**
     * 포워드 프록시 설정 모달 초기화 함수
     * @param {HTMLElement} modalContent - 모달 콘텐츠 요소
     * @param {string} windowId - 모달 창 ID
     */
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
                    appendTerminalLog(data.message);
                    console.log('포워드 모드 설정 응답:', data.message); // 디버깅 로그 추가
                    closeModal(windowId);
                    updateUIForMode('forward'); // UI 업데이트 추가

                    window.electronAPI.runPACSetup();
                } catch (error) {
                    console.error('Forward 모드 전환 실패:', error);
                    appendTerminalLog('Forward 모드 전환에 실패했습니다.');
                }
            });

            cancelBtn.addEventListener('click', () => {
                closeModal(windowId);
            });
        }
    }

    /**
     * 연결 진행 상태 모달 초기화 함수
     * @param {HTMLElement} modalContent - 모달 콘텐츠 요소
     * @param {string} windowId - 모달 창 ID
     */
    function initConnectionProgressModal(modalContent, windowId) {
        // 진행 바 애니메이션을 위한 추가 기능이 필요하면 여기에 작성
        // 현재는 모달이 자동으로 닫히는 로직이 없으므로 추가적인 구현이 필요
    }

    /**
     * 기능 토글 함수
     * @param {string} feature - 토글할 기능 이름
     * @param {boolean} enabled - 기능 활성화 여부
     */
    async function toggleFeature(feature, enabled) {
        try {
            const res = await fetch('https://localhost:5000/toggle-feature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature, enabled }),
            });
            const result = await res.json();
            appendTerminalLog(result.message);
            console.log(`기능 토글 응답 (${feature}):`, result.message); // 디버깅 로그 추가
            // 필요 시, 관련 UI 업데이트 함수 호출
        } catch (error) {
            console.error(`Failed to toggle feature ${feature}:`, error);
            appendTerminalLog(`기능 토글에 실패했습니다: ${feature}`);
        }
    }

    /**
     * PAC 스냅샷 함수
     * @param {string} windowId - 모달 창 ID
     */
    function captureSnapshot(windowId) {
        console.log(`Capturing snapshot for window ID: ${windowId}`);
        const modal = document.getElementById(`modalWindow_${windowId}`);
        if (!modal) {
            console.error(`Modal window with ID ${windowId} not found.`);
            return;
        }

        html2canvas(modal).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const snapshot = {
                windowId: windowId,
                title: `창 ${windowId} 스냅샷`,
                imgData: imgData
            };
            console.log('Snapshot captured:', snapshot);
            window.addSnapshot(snapshot);
        }).catch(error => {
            console.error('Snapshot capture failed:', error);
            appendTerminalLog('스냅샷 캡처에 실패했습니다.');
        });
    }

    /**
     * 시스템 모드 UI 업데이트 함수
     * @param {string} mode - 현재 시스템 모드 ('forward' 또는 'reverse')
     */
    function updateUIForMode(mode) {
        console.log(`updateUIForMode 호출됨. 전달된 모드: ${mode}`); // 디버깅 로그 추가

        const proxyStatusMessage = document.getElementById('proxyStatusMessage');
        const disconnectContainer = document.getElementById('disconnectContainer');

        if (!proxyStatusMessage || !disconnectContainer) {
            console.error('UI 요소를 찾을 수 없습니다: proxyStatusMessage 또는 disconnectContainer');
            return;
        }

        if (mode === 'forward') {
            // 포워드 모드일 때 UI 변경
            proxyStatusMessage.style.display = 'block';
            document.getElementById('connectionTime').textContent = new Date().toLocaleTimeString();

            // 연결 해제 버튼 표시
            disconnectContainer.style.display = 'block';

            // 포워드 모드에 따른 추가 UI 변경이 필요하면 여기에 추가
            appendTerminalLog(`시스템 모드가 ${mode}로 변경되었습니다.`);
            console.log(`시스템 모드가 ${mode}로 변경되었습니다.`);
        } else if (mode === 'reverse') {
            // 리버스 모드일 때 UI 변경
            proxyStatusMessage.style.display = 'none';
            disconnectContainer.style.display = 'none';

            // 리버스 모드에 따른 추가 UI 변경이 필요하면 여기에 추가
            appendTerminalLog(`시스템 모드가 ${mode}로 변경되었습니다.`);
            console.log(`시스템 모드가 ${mode}로 변경되었습니다.`);
        } else {
            // 기본 상태
            proxyStatusMessage.style.display = 'none';
            disconnectContainer.style.display = 'none';
            appendTerminalLog(`시스템 모드가 ${mode}로 변경되었습니다.`);
            console.log(`시스템 모드가 ${mode}로 변경되었습니다.`);
        }
    }

    /**
     * 초기 UI 설정 함수
     */
    function initializeUI() {
        fetch('https://localhost:5000/status', {
            headers: { 'Content-Type': 'application/json' }
        })
        .then(res => res.json())
        .then(statusData => {
            const mode = statusData.mode; // 'forward' 또는 'reverse' 등
            console.log(`초기 시스템 모드: ${mode}`); // 디버깅 로그 추가
            updateUIForMode(mode);
        })
        .catch(error => {
            console.error('초기 상태를 가져오는 데 실패했습니다:', error);
            appendTerminalLog('초기 상태를 가져오는 데 실패했습니다.');
        });
    }

    /**
     * 연결 해제 버튼 이벤트 핸들러 초기화
     */
    function initDisconnectButton() {
        const disconnectButton = document.getElementById('disconnectButton');
        if (disconnectButton) {
            disconnectButton.addEventListener('click', async () => {
                try {
                    const res = await fetch('https://localhost:5000/set-mode', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ mode: 'reverse' })
                    });
                    const data = await res.json();
                    appendTerminalLog(data.message);
                    console.log('리버스 모드 설정 응답:', data.message); // 디버깅 로그 추가
                    updateUIForMode('reverse'); // UI 업데이트
                } catch (error) {
                    console.error('Disconnect failed:', error);
                    appendTerminalLog('연결 해제에 실패했습니다.');
                }
            });
        }
    }

    // 초기화 시 연결 해제 버튼 이벤트 핸들러도 초기화
    initDisconnectButton();
}
