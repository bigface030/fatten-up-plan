const scale = 2;
const intermediateScale = 5;

export const add = (...nums: number[]) =>
  nums.reduce((acc, val) => acc + val * 10 ** scale, 0) / 10 ** scale;

export const subtract = (...nums: number[]) => {
  const [minuend, ...subtrahends] = nums;
  return (
    subtrahends.reduce((acc, val) => acc - val * 10 ** scale, minuend * 10 ** scale) / 10 ** scale
  );
};

export const multiply = (...nums: number[]) => {
  const result = nums.reduce((acc, val) => Number((acc * val).toFixed(intermediateScale)), 1);
  return Number(result.toFixed(scale));
};

export const divide = (...nums: number[]) => {
  const [dividend, ...divisors] = nums;
  const result = divisors.reduce(
    (acc, val) => Number((acc / val).toFixed(intermediateScale)),
    dividend,
  );
  return Number(result.toFixed(scale));
};
