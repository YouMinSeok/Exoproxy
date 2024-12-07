const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, 'routes.json');

// 초기 경로 설정
let routes = {
    frontend: [],
    currentIndex: 0,
};

// 기존의 routes.json 파일이 있으면 로드
if (fs.existsSync(routesPath)) {
    const data = fs.readFileSync(routesPath);
    routes = JSON.parse(data);
}

function saveRoutes() {
    fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
}

function addFrontendUrl(url) {
    routes.frontend.push(url);
    saveRoutes();
}

function updateCurrentIndex() {
    routes.currentIndex = (routes.currentIndex + 1) % routes.frontend.length;
    saveRoutes();
}

module.exports = {
    frontend: routes.frontend,
    currentIndex: routes.currentIndex,
    saveRoutes,
    addFrontendUrl,
    updateCurrentIndex,
};
