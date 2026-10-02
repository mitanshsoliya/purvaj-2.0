/**
 * Convert numerical amounts into Indian Rupee words
 * e.g. 54200 -> "Rupees Fifty-Four Thousand Two Hundred Only"
 */
export const numberToWords = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 'Zero Rupees';
  const val = Math.round(Number(num));
  if (val === 0) return 'Zero Rupees Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];

  const n = ('000000000' + val.toString()).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return 'Rupees ' + val.toString() + ' Only';

  let str = '';
  str += n[1] != 0 ? (a[Number(n[1])] || b[n[1][0]] + a[n[1][1]]) + 'Crore ' : '';
  str += n[2] != 0 ? (a[Number(n[2])] || b[n[2][0]] + a[n[2][1]]) + 'Lakh ' : '';
  str += n[3] != 0 ? (a[Number(n[3])] || b[n[3][0]] + a[n[3][1]]) + 'Thousand ' : '';
  str += n[4] != 0 ? (a[Number(n[4])] || b[n[4][0]] + a[n[4][1]]) + 'Hundred ' : '';
  str += n[5] != 0 ? (str != '' ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + a[n[5][1]]) : '';

  return `Rupees ${str.trim()} Only`;
};

export default numberToWords;
