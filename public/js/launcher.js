// public/js/launcher.js

export function initLauncher() {
    const openFrontendModalBtn = document.getElementById('openFrontendModal');
    const openFeaturesModalBtn = document.getElementById('openFeaturesModal');
    const openStatusModalBtn = document.getElementById('openStatusModal');
    const openTerminalModalBtn = document.getElementById('openTerminalModal');
    const forwardProxyIcon = document.getElementById('forwardProxyIcon');
    const powerOffBtn = document.getElementById('powerOffBtn');
    const activitiesOverviewBtn = document.getElementById('activitiesOverviewBtn');

    // 버튼 ID와 템플릿 ID를 정확히 매핑하기 위한 객체
    const buttonToTemplateMap = {
        openFrontendModal: 'frontendTemplate',
        openFeaturesModal: 'featuresTemplate',
        openStatusModal: 'statusTemplate',
        openTerminalModal: 'terminalTemplate',
        forwardProxyIcon: 'forwardProxyModalTemplate',
        powerOffBtn: 'confirmPoweroffTemplate'
    };

    // 모달 창을 여는 함수 (전역에서 사용할 수 있도록 이벤트를 dispatch)
    function openModal(event) {
        const buttonId = event.currentTarget.id;
        const templateId = buttonToTemplateMap[buttonId];
        if (templateId) {
            const customEvent = new CustomEvent('openModal', { detail: { templateId } });
            document.dispatchEvent(customEvent);
        } else {
            console.error(`No template mapped for button ID: ${buttonId}`);
        }
    }

    // 이벤트 리스너 등록
    openFrontendModalBtn.addEventListener('click', openModal);
    openFeaturesModalBtn.addEventListener('click', openModal);
    openStatusModalBtn.addEventListener('click', openModal);
    openTerminalModalBtn.addEventListener('click', openModal);
    forwardProxyIcon.addEventListener('click', openModal);
    powerOffBtn.addEventListener('click', openModal);
    activitiesOverviewBtn.addEventListener('click', () => {
        const customEvent = new CustomEvent('openOverview');
        document.dispatchEvent(customEvent);
    });
}
