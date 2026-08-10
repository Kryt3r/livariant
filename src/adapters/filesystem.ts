export interface FilesystemAdapter {
  readonly kind: "filesystem";
}

export const filesystemAdapter: FilesystemAdapter = {
  kind: "filesystem",
};
