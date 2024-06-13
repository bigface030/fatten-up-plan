const scale = 2;

export const add = (...nums: number[]) =>
  nums.reduce((acc, val) => acc + val * 10 ** scale, 0) / 10 ** scale;

export const subtract = (...nums: number[]) => {
  const [first, ...rest] = nums;
  return rest.reduce((acc, val) => acc - val * 10 ** scale, first * 10 ** scale) / 10 ** scale;
};
