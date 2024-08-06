import { operateReadSettlement } from './operateUtils';

test('operateReadSettlement', () => {
  const splitList = [
    [
      { username: 'A', amount: 100 },
      { username: 'D', amount: -100 },
    ],
    [
      { username: 'B', amount: 50 },
      { username: 'C', amount: -50 },
    ],
  ];
  const result = {
    totals: {
      A: 100,
      B: 50,
      C: -50,
      D: -100,
    },
    payments: [
      {
        payer: 'D',
        receiver: 'A',
        amount: 100,
      },
      {
        payer: 'C',
        receiver: 'B',
        amount: 50,
      },
    ],
  };
  expect(operateReadSettlement(splitList)).toEqual(result);
});

test('operateReadSettlement', () => {
  const splitList = [
    [
      { username: 'A', amount: 100 },
      { username: 'C', amount: -75 },
      { username: 'D', amount: -25 },
    ],
    [
      { username: 'B', amount: 50 },
      { username: 'C', amount: -50 },
    ],
  ];
  const result = {
    totals: {
      A: 100,
      B: 50,
      C: -125,
      D: -25,
    },
    payments: [
      {
        payer: 'C',
        receiver: 'A',
        amount: 100,
      },
      {
        payer: 'C',
        receiver: 'B',
        amount: 25,
      },
      {
        payer: 'D',
        receiver: 'B',
        amount: 25,
      },
    ],
  };
  expect(operateReadSettlement(splitList)).toEqual(result);
});
