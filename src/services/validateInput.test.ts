import { dictionary, intervals, tags } from '../utils/fileUtils';
import { ACTIONS } from './constants';
import { datesFor } from './dateUtils';
import { validateInput } from './validateInput';

test('input invalid command', () => {
  expect(validateInput(['ABC'])).toEqual({
    status: 'failed',
    msg: 'Invalid command',
  });
  expect(validateInput(['支出', '100'])).toEqual({
    status: 'failed',
    msg: 'Invalid tag',
  });
});

test('delete the latest record', () => {
  expect(validateInput(['刪除上一筆', 'ABC'])).toEqual({
    status: 'failed',
    msg: 'Invalid params length',
  });
  expect(validateInput(['刪除上一筆'])).toEqual({
    status: 'success',
    body: {
      type: 'delete',
      params: {},
    },
  });
});

test('read balance of the records', () => {
  expect(validateInput(['查詢', '今日', 'ABC'])).toEqual({
    status: 'failed',
    msg: 'Invalid params length',
  });
  expect(validateInput(['查詢', '今日'])).toEqual({
    status: 'success',
    body: {
      type: 'read',
      action: ACTIONS[dictionary['查詢']],
      params: {
        interval: datesFor(intervals['今日']),
      },
    },
  });
  expect(validateInput(['查詢'])).toEqual({
    status: 'failed',
    msg: 'Invalid params length',
  });
  expect(validateInput(['查詢', '20240531', '20240601', 'ABC'])).toEqual({
    status: 'failed',
    msg: 'Invalid params length',
  });
  expect(validateInput(['查詢', '1130531'])).toEqual({
    status: 'failed',
    msg: 'Invalid params value',
  });
  expect(validateInput(['查詢', '1130531', '1130601'])).toEqual({
    status: 'failed',
    msg: 'Invalid params value',
  });
  expect(validateInput(['查詢', '20240531', '1130601'])).toEqual({
    status: 'failed',
    msg: 'Invalid params value',
  });
  expect(validateInput(['查詢', '20240531'])).toEqual({
    status: 'success',
    body: {
      type: 'read',
      action: ACTIONS[dictionary['查詢']],
      params: {
        interval: datesFor(['20240531']),
      },
    },
  });
  expect(validateInput(['查詢', '20240531', '20240601'])).toEqual({
    status: 'success',
    body: {
      type: 'read',
      action: ACTIONS[dictionary['查詢']],
      params: {
        interval: datesFor(['20240531', '20240601']),
      },
    },
  });
  expect(validateInput(['查詢', '20240601', '20240531'])).toEqual({
    status: 'success',
    body: {
      type: 'read',
      action: ACTIONS[dictionary['查詢']],
      params: {
        interval: datesFor(['20240601', '20240531']),
      },
    },
  });
});

test('create record', () => {
  expect(validateInput(['早餐', '100', '信用卡', 'ABC'])).toEqual({
    status: 'failed',
    msg: 'Invalid params length',
  });
  expect(validateInput(['早餐', '$100'])).toEqual({
    status: 'failed',
    msg: 'Invalid amount',
  });
  expect(validateInput(['早餐', '100'])).toEqual({
    status: 'success',
    body: {
      type: 'create',
      params: {
        activity: dictionary[tags['早餐'].transaction_type],
        customized_tag: '早餐',
        customized_classification: tags['早餐'].classification,
        amount: 100,
        description: undefined,
      },
    },
  });
  expect(validateInput(['早餐', '100', '信用卡'])).toEqual({
    status: 'success',
    body: {
      type: 'create',
      params: {
        activity: dictionary[tags['早餐'].transaction_type],
        customized_tag: '早餐',
        customized_classification: tags['早餐'].classification,
        amount: 100,
        description: '信用卡',
      },
    },
  });
  expect(validateInput(['早餐', '100', '100'])).toEqual({
    status: 'success',
    body: {
      type: 'create',
      params: {
        activity: dictionary[tags['早餐'].transaction_type],
        customized_tag: '早餐',
        customized_classification: tags['早餐'].classification,
        amount: 100,
        description: '100',
      },
    },
  });
});
