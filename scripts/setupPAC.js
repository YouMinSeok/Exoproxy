const { exec } = require('child_process');
const os = require('os');

function setWindowsPAC() {
    // AutoProxyEnable = 1 설정 후 AutoConfigURL 설정
    const enableCommand = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v AutoProxyEnable /t REG_DWORD /d 1 /f`;
    exec(enableCommand, (err, stdout, stderr) => {
        if (err) {
            console.error('Windows AutoProxyEnable 설정 실패:', stderr);
            process.exit(1);
        } else {
            console.log('Windows AutoProxyEnable 설정 완료');
            const pacCommand = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v AutoConfigURL /t REG_SZ /d "http://localhost:5000/proxy.pac" /f`;
            exec(pacCommand, (err2, stdout2, stderr2) => {
                if (err2) {
                    console.error('PAC 파일 설정 실패:', stderr2);
                    process.exit(1);
                } else {
                    console.log('PAC 파일이 자동으로 설정되었습니다(Windows).');
                    process.exit(0);
                }
            });
        }
    });
}

function setMacPAC() {
    // macOS에서 사용 가능한 네트워크 서비스 목록 가져오기
    exec('networksetup -listallnetworkservices', (err, stdout, stderr) => {
        if (err) {
            console.error('네트워크 서비스 목록 조회 실패:', stderr);
            process.exit(1);
        } else {
            const lines = stdout.trim().split('\n').slice(1); // 첫줄은 "An asterisk..."
            // Wi-Fi를 우선 찾기
            let service = lines.find(line => line.trim() === 'Wi-Fi');

            // 만약 Wi-Fi가 없다면 첫 번째 서비스 선택
            if (!service && lines.length > 0) {
                service = lines[0].trim();
            }

            if (!service) {
                console.warn('사용 가능한 네트워크 서비스가 없습니다. PAC 설정 불가.');
                process.exit(0);
            }

            const command = `networksetup -setautoproxyurl "${service}" "http://localhost:5000/proxy.pac" && networksetup -setautoproxystate "${service}" on`;
            exec(command, (err2, stdout2, stderr2) => {
                if (err2) {
                    console.error('PAC 파일 설정 실패:', stderr2);
                    process.exit(1);
                } else {
                    console.log(`PAC 파일이 자동으로 설정되었습니다(macOS, 서비스: ${service}).`);
                    process.exit(0);
                }
            });
        }
    });
}

function setLinuxPAC() {
    // GNOME 환경 가정
    const command = `gsettings set org.gnome.system.proxy autoconfig-url "http://localhost:5000/proxy.pac" && gsettings set org.gnome.system.proxy mode 'auto'`;
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error('PAC 파일 설정 실패:', stderr);
            process.exit(1);
        } else {
            console.log('PAC 파일이 자동으로 설정되었습니다(Linux GNOME).');
            process.exit(0);
        }
    });
}

function setPAC() {
    const platform = os.platform();
    if (platform === 'win32') {
        setWindowsPAC();
    } else if (platform === 'darwin') {
        setMacPAC();
    } else if (platform === 'linux') {
        setLinuxPAC();
    } else {
        console.warn('자동 PAC 설정을 지원하지 않는 운영 체제입니다.');
        process.exit(0);
    }
}

setPAC();
