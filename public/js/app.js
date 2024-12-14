// public/js/app.js

import { initTopBar } from './topbar.js';
import { initLauncher } from './launcher.js';
import { initSnapshots } from './snapshots.js';
import { initModals } from './modals.js';
// 추가적인 모듈을 필요에 따라 import

document.addEventListener('DOMContentLoaded', () => {
    initTopBar();
    initLauncher();
    initSnapshots();
    initModals();
    // 기타 초기화 함수 호출
});
