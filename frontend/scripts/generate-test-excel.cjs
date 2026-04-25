const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'tests', 'e2e', 'config', 'test-import-data.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'tests', 'e2e', 'fixtures', 'test-import.xlsx');

function loadConfig() {
  console.log(`Looking for config at: ${CONFIG_PATH}`);
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Config file not found: ${CONFIG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

const POSITION_MAP = {
  'TOP': '上单',
  'JUNGLE': '打野',
  'MID': '中单',
  'ADC': 'ADC',
  'SUPPORT': '辅助'
};

async function createTestExcel() {
  const teams = loadConfig();

  if (!Array.isArray(teams)) {
    throw new Error('Config should be an array of teams');
  }

  console.log(`Loading test data from: ${CONFIG_PATH}`);
  console.log(`Total teams: ${teams.length}`);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('战队与队员信息导入');

  sheet.getCell('A1').value = '战队与队员信息导入模板';
  sheet.getCell('A1').font = { size: 14, bold: true };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  sheet.getCell('A2').value = '说明：每支战队占5行，分别对应5个位置（上单、打野、中单、ADC、辅助）。请按顺序填写，同一战队只需在第1行填写战队信息。';
  sheet.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } };
  sheet.mergeCells('A2:N2');

    sheet.getCell('A3').value = '战队名称';
    sheet.getCell('B3').value = '队标URL';
    sheet.getCell('C3').value = '参赛宣言';
    sheet.getCell('D3').value = '位置';
    sheet.getCell('E3').value = '队员昵称';
    sheet.getCell('F3').value = '队员游戏ID';
    sheet.getCell('G3').value = '队员头像URL';
    sheet.getCell('H3').value = '评分';
    sheet.getCell('I3').value = '是否队长';
    sheet.getCell('J3').value = '实力等级';
    sheet.getCell('K3').value = '常用英雄';
    sheet.getCell('L3').value = '直播间号';
    sheet.getCell('M3').value = '个人简介';
    sheet.getCell('N3').value = '拍卖价';

  const headerRow = sheet.getRow(3);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFCCE5FF' }
  };

  let rowNum = 4;

  for (const team of teams) {
    const { teamName, logoUrl, battleCry, members } = team;

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const position = POSITION_MAP[member.position] || member.position;
      const championPool = Array.isArray(member.championPool)
        ? member.championPool.join(',')
        : (member.championPool || '');

      // 战队信息只在第1行（i === 0）填写，后续4行留空
      if (i === 0) {
        sheet.getCell(rowNum, 1).value = teamName;
        sheet.getCell(rowNum, 2).value = logoUrl || '';
        sheet.getCell(rowNum, 3).value = battleCry || '';
      } else {
        sheet.getCell(rowNum, 1).value = '';
        sheet.getCell(rowNum, 2).value = '';
        sheet.getCell(rowNum, 3).value = '';
      }

      sheet.getCell(rowNum, 4).value = position;
      sheet.getCell(rowNum, 5).value = member.nickname;
      sheet.getCell(rowNum, 6).value = member.gameId || '';
      sheet.getCell(rowNum, 7).value = member.avatarUrl || '';
      sheet.getCell(rowNum, 8).value = member.rating || 60;
      sheet.getCell(rowNum, 9).value = member.isCaptain || '否';
      sheet.getCell(rowNum, 10).value = member.level || 'B';
      sheet.getCell(rowNum, 11).value = championPool;
      sheet.getCell(rowNum, 12).value = member.liveRoom || '000000';
      sheet.getCell(rowNum, 13).value = member.bio || '';
      sheet.getCell(rowNum, 14).value = member.auctionPrice || 0;

      sheet.getCell(`D${rowNum}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"上单,打野,中单,ADC,辅助"'],
      };

      sheet.getCell(`I${rowNum}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"是,否"'],
      };

      sheet.getCell(`J${rowNum}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"S,A,B,C,D"'],
      };

      rowNum++;
    }
  }

  for (let col = 1; col <= 14; col++) {
    sheet.getColumn(col).width = 15;
  }
  sheet.getColumn(3).width = 20;
  sheet.getColumn(11).width = 25;
  sheet.getColumn(13).width = 25;

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await workbook.xlsx.writeFile(OUTPUT_PATH);
  console.log(`\n✅ Test Excel created successfully!`);
  console.log(`   Output: ${OUTPUT_PATH}`);
  console.log(`   Total teams: ${teams.length}`);
  console.log(`   Total members: ${teams.reduce((sum, t) => sum + t.members.length, 0)}`);
}

createTestExcel().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});