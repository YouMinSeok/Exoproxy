// public/js/snapshots.js

export function initSnapshots() {
    const overviewOverlay = document.getElementById('overviewOverlay');
    const closeOverviewBtn = document.getElementById('closeOverviewBtn');
    const snapshotContainer = document.getElementById('snapshotContainer');

    // 스냅샷 추가 함수
    function addSnapshot(snapshot) {
        console.log('Adding snapshot:', snapshot); // 디버깅 로그

        // 기존에 해당 창의 스냅샷이 있으면 제거
        removeSnapshot(snapshot.windowId);

        const snapshotDiv = document.createElement('div');
        snapshotDiv.classList.add('snapshot');
        snapshotDiv.setAttribute('data-window-id', snapshot.windowId);

        const img = document.createElement('img');
        img.src = snapshot.imgData;
        img.alt = `창 ${snapshot.windowId} 스냅샷`;

        const closeBtn = document.createElement('button');
        closeBtn.classList.add('snapshot-close-btn');
        closeBtn.innerHTML = '&times;';
        closeBtn.title = '스냅샷 삭제';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeSnapshot(snapshot.windowId);
        });

        snapshotDiv.appendChild(img);
        snapshotDiv.appendChild(closeBtn);

        // 스냅샷 클릭 시 창 복원
        snapshotDiv.addEventListener('click', () => {
            restoreWindow(snapshot.windowId);
            closeOverview();
        });

        snapshotContainer.appendChild(snapshotDiv);
        console.log('Snapshot added to container.');
    }

    // 스냅샷 제거 함수
    function removeSnapshot(windowId) {
        const snapshotDiv = snapshotContainer.querySelector(`.snapshot[data-window-id="${windowId}"]`);
        if (snapshotDiv) {
            snapshotContainer.removeChild(snapshotDiv);
            console.log(`Snapshot for window ID ${windowId} removed.`);
        }
    }

    // 창 복원 함수 (모달을 다시 표시)
    function restoreWindow(windowId) {
        const modalBackdrop = document.getElementById(`modalBackdrop_${windowId}`);
        if (modalBackdrop) {
            modalBackdrop.style.display = 'flex';
            setTimeout(() => {
                modalBackdrop.classList.add('show');
            }, 10);

            // Z-Index 최상위 설정
            const currentZIndex = getMaxZIndex() + 1;
            modalBackdrop.style.zIndex = currentZIndex;
            console.log(`ModalBackdrop ${windowId} restored.`);
        } else {
            console.warn(`Backdrop not found for window ID: ${windowId}`);
        }
    }

    // Z-Index 최댓값 계산 함수
    function getMaxZIndex() {
        const elements = document.getElementsByTagName('*');
        let max = 0;
        for (let i = 0; i < elements.length; i++) {
            const z = parseInt(window.getComputedStyle(elements[i]).zIndex, 10);
            if (!isNaN(z) && z > max) max = z;
        }
        return max;
    }

    // 활동 개요 열기 함수
    function openOverview() {
        overviewOverlay.style.display = 'flex';
        overviewOverlay.classList.add('open');
        document.body.style.pointerEvents = 'none';
        overviewOverlay.style.pointerEvents = 'auto';
    }

    // 활동 개요 닫기 함수
    function closeOverview() {
        overviewOverlay.classList.remove('open');
        overviewOverlay.addEventListener('transitionend', () => {
            if (!overviewOverlay.classList.contains('open')) {
                overviewOverlay.style.display = 'none';
            }
        }, { once: true });
        document.body.style.pointerEvents = 'auto';
    }

    // 커스텀 이벤트 리스너 등록
    document.addEventListener('openModal', (e) => {
        // 모달 관련 스냅샷 로직이 필요하다면 추가
    });

    document.addEventListener('openOverview', openOverview);
    closeOverviewBtn.addEventListener('click', closeOverview);

    // 외부에서 스냅샷을 추가할 수 있도록 전역 함수 제공
    window.addSnapshot = addSnapshot;
}
