import { dictionary, intervals, tags } from '../utils/fileUtils';
import { ACTIONS } from './constants';
import { formatDate, formatDefaultDateInterval } from './dateUtils';
import { validateInput } from './validateInput';

test('input invalid command', () => {
  expect(validateInput(['ABC'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_command',
  });
});

test('delete the latest record', () => {
  expect(validateInput(['刪除上一筆', '支出', 'ABC'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_length',
  });
  expect(validateInput(['刪除上一筆', '消費'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_value',
  });
  expect(validateInput(['刪除上一筆', '支出'])).toEqual({
    status: 'success',
    body: {
      type: 'delete',
      params: {
        activity: dictionary['支出'],
      },
    },
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
    msg: 'user_error_invalid_params_length',
  });
  expect(validateInput(['查詢', '今日'])).toEqual({
    status: 'success',
    body: {
      type: 'read',
      action: ACTIONS[dictionary['查詢']],
      params: {
        interval: formatDefaultDateInterval(intervals['今日']),
      },
    },
  });
  expect(validateInput(['查詢'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_length',
  });
  expect(validateInput(['查詢', '20240531', '20240601', 'ABC'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_length',
  });
  expect(validateInput(['查詢', '1130531'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_value',
  });
  expect(validateInput(['查詢', '1130531', '1130601'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_value',
  });
  expect(validateInput(['查詢', '20240531', '1130601'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_value',
  });
  expect(validateInput(['查詢', '20240531'])).toEqual({
    status: 'success',
    body: {
      type: 'read',
      action: ACTIONS[dictionary['查詢']],
      params: {
        interval: [formatDate('20240531')],
      },
    },
  });
  expect(validateInput(['查詢', '20240531', '20240601'])).toEqual({
    status: 'success',
    body: {
      type: 'read',
      action: ACTIONS[dictionary['查詢']],
      params: {
        interval: ['20240531', '20240601'].map(formatDate),
      },
    },
  });
  expect(validateInput(['查詢', '20240601', '20240531'])).toEqual({
    status: 'success',
    body: {
      type: 'read',
      action: ACTIONS[dictionary['查詢']],
      params: {
        interval: ['20240601', '20240531'].map(formatDate),
      },
    },
  });
});

test('create record', () => {
  expect(validateInput(['早餐'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_length',
  });
  expect(validateInput(['早餐', '100', '信用卡', 'ABC'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_length',
  });
  expect(validateInput(['早餐', '$100'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_value',
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

test('fully creating record', () => {
  expect(validateInput(['支出'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_length',
  });
  expect(validateInput(['支出', '20240531'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_length',
  });
  expect(validateInput(['支出', '20240531', '早餐'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_length',
  });
  expect(validateInput(['支出', '20240531', '早餐', '100', '信用卡', 'ABC'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_length',
  });
  expect(validateInput(['支出', '1130531', '早餐', '100'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_value',
  });
  expect(validateInput(['支出', '20240531', '早安', '100'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_value',
  });
  expect(validateInput(['支出', '20240531', '薪水', '100'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_value',
  });
  expect(validateInput(['支出', '20240531', '早餐', '$100'])).toEqual({
    status: 'failed',
    msg: 'user_error_invalid_params_value',
  });
  expect(validateInput(['支出', '20240531', '早餐', '100'])).toEqual({
    status: 'success',
    body: {
      type: 'create',
      params: {
        activity: dictionary['支出'],
        customized_tag: '早餐',
        customized_classification: tags['早餐'].classification,
        amount: 100,
        description: undefined,
        accounting_date: formatDate('20240531'),
      },
    },
  });
  expect(validateInput(['支出', '20240531', '早餐', '100', '100'])).toEqual({
    status: 'success',
    body: {
      type: 'create',
      params: {
        activity: dictionary['支出'],
        customized_tag: '早餐',
        customized_classification: tags['早餐'].classification,
        amount: 100,
        description: '100',
        accounting_date: formatDate('20240531'),
      },
    },
  });
});
