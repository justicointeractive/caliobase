export function pMap<TIn, TOut>(
  arr: TIn[],
  fn: (item: TIn, index: number, arr: TIn[]) => Promise<TOut> | TOut,
  { concurrency = 5 }: { concurrency?: number }
) {
  return new Promise<TOut[]>(function (resolve, reject) {
    let completed = 0,
      started = 0,
      running = 0;

    const results: TOut[] = new Array(arr.length);

    (function replenish() {
      if (completed >= arr.length) {
        return resolve(results);
      }

      while (running < concurrency && started < arr.length) {
        running++;
        started++;

        // eslint-disable-next-line no-loop-func
        ((index) => {
          const cur = arr[index];
          Promise.resolve(fn.call(cur, cur, index, arr))
            .then(function (result) {
              running--;
              completed++;
              results[index] = result;

              replenish();
            })
            .catch(reject);
        })(started - 1);
      }
    })();
  });
}
