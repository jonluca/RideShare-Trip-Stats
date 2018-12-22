function convertArrayOfObjectsToCSV(args) {
  let result,
    ctr,
    keys,
    columnDelimiter,
    lineDelimiter,
    data;

  data = args.data || null;
  if (data == null || !data.length) {
    return null;
  }

  columnDelimiter = args.columnDelimiter || ',';
  lineDelimiter = args.lineDelimiter || '\n';

  keys = Object.keys(data[0]);

  result = '';
  result += keys.join(columnDelimiter);
  result += lineDelimiter;

  data.forEach(function (item) {
    ctr = 0;
    keys.forEach(function (key) {
      if (ctr > 0) {
        result += columnDelimiter;
      }
      let val = item[key];
      if (typeof (val) === "object") {
        val = btoa(JSON.stringify(val));
      }
      if (val && typeof (val) === "string") {
        val = val.replace(/,/g, '-');
        val = val.normalize("NFKD").replace(/[^\w]/g, '');
      }
      result += val;
      ctr++;
    });
    result += lineDelimiter;
  });

  return result;
}

function uppercaseFirst(txt) {
  return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
}