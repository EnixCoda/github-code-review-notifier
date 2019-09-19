export function dePromiseLike<T>(pLike: PromiseLike<T>): Promise<T> {
  return new Promise<T>(resolve => pLike.then(resolve))
}
