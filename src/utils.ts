export function downloadFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "octet/stream" });
  const url = URL.createObjectURL(blob);
  const hiddenElement = document.createElement("a");
  hiddenElement.href = url;
  hiddenElement.target = "_blank";
  hiddenElement.download = filename;
  hiddenElement.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  });
}
