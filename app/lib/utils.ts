export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export function parseBase64Payload(dataUrlOrBase64: string) {
  return dataUrlOrBase64.includes(',') ? dataUrlOrBase64.split(',')[1] : dataUrlOrBase64;
}

export function escapeLike(value: string) {
  return value.replace(/[%_\\]/g, '\\$&');
}

export function isSafeSlug(value: string) {
  return /^[a-z0-9-]{1,128}$/.test(value);
}
