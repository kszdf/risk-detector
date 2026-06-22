const fs = require('fs');
const path = require('path');

// 原始二维码文件路径（需要用户上传）
const qrPath = path.join(__dirname, 'qr_200x200.png');

// 如果文件存在，读取并转base64
if (fs.existsSync(qrPath)) {
  const imgBuffer = fs.readFileSync(qrPath);
  const base64 = imgBuffer.toString('base64');
  
  // 读取RiskV4Module.tsx
  const modulePath = path.join(__dirname, 'src/components/RiskV4Module.tsx');
  let content = fs.readFileSync(modulePath, 'utf8');
  
  // 替换base64
  content = content.replace(/src="data:image\/png;base64,[^"]+"/, 'src="data:image/png;base64,' + base64 + '"');
  
  fs.writeFileSync(modulePath, content);
  console.log('QR code replaced successfully, base64 length: ' + base64.length);
} else {
  console.log('qr_200x200.png not found');
}
