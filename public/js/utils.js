// public/js/utils.js

/**
 * 터미널 로그 추가 함수
 * @param {string} msg - 추가할 메시지
 */
export function appendTerminalLog(msg) {
    // 터미널 로그 추가 로직 구현
    const terminalOutput = document.querySelector('.terminal-output');
    if (terminalOutput) {
        const line = document.createElement('div');
        line.textContent = msg;
        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    } else {
        console.warn('터미널 출력 요소를 찾을 수 없습니다.');
    }
}

/**
 * 스냅샷 제거 함수
 * @param {string} windowId - 모달 창 ID
 */
export function removeSnapshot(windowId) {
    // 스냅샷 제거 로직 구현
    // 예시: snapshotContainer에서 해당 스냅샷 삭제
    const snapshotContainer = document.getElementById('snapshotContainer');
    if (snapshotContainer) {
        const snapshot = snapshotContainer.querySelector(`[data-window-id="${windowId}"]`);
        if (snapshot) {
            snapshot.remove();
        }
    }
}
