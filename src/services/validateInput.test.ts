import { dictionary, intervals, tags } from '../utils/fileUtils';
import { ACTIONS } from './constants';
import { formatDate, formatDefaultDateInterval } from './dateUtils';
import { createInputValidator, validationRules } from './validateInput';

const validateInput = createInputValidator(validationRules);

test('input invalid command', () => {
  expect(() => validateInput(['ABC'])).toThrow('user_error_invalid_command');
});

test('delete the latest record', () => {
  expect(() => validateInput(['刪除上一筆', '支出', 'ABC'])).toThrow(
    'user_error_invalid_params_length',
  );
  expect(() => validateInput(['刪除上一筆', '消費'])).toThrow('user_error_invalid_params_value');
  expect(validateInput(['刪除上一筆', '支出'])).toEqual({
    type: 'delete',
    params: {
      activity: dictionary['支出'],
    },
  });
  expect(validateInput(['刪除上一筆'])).toEqual({
    type: 'delete',
    params: {},
  });
});

test('read balance of the records', () => {
  expect(() => validateInput(['查詢', '今日', 'ABC'])).toThrow('user_error_invalid_params_length');
  expect(validateInput(['查詢', '今日'])).toEqual({
    type: 'read',
    action: ACTIONS[dictionary['查詢']],
    params: {
      interval: formatDefaultDateInterval(intervals['今日']),
    },
  });
  expect(() => validateInput(['查詢'])).toThrow('user_error_invalid_params_length');
  expect(() => validateInput(['查詢', '20240531', '20240601', 'ABC'])).toThrow(
    'user_error_invalid_params_length',
  );
  expect(() => validateInput(['查詢', '1130531'])).toThrow('user_error_invalid_params_value');
  expect(() => validateInput(['查詢', '1130531', '1130601'])).toThrow(
    'user_error_invalid_params_value',
  );
  expect(() => validateInput(['查詢', '20240531', '1130601'])).toThrow(
    'user_error_invalid_params_value',
  );
  expect(validateInput(['查詢', '20240531'])).toEqual({
    type: 'read',
    action: ACTIONS[dictionary['查詢']],
    params: {
      interval: [formatDate('20240531')],
    },
  });
  expect(validateInput(['查詢', '20240531', '20240601'])).toEqual({
    type: 'read',
    action: ACTIONS[dictionary['查詢']],
    params: {
      interval: ['20240531', '20240601'].map(formatDate),
    },
  });
  expect(validateInput(['查詢', '20240601', '20240531'])).toEqual({
    type: 'read',
    action: ACTIONS[dictionary['查詢']],
    params: {
      interval: ['20240601', '20240531'].map(formatDate),
    },
  });
});

test('create record', () => {
  expect(() => validateInput(['早餐'])).toThrow('user_error_invalid_params_length');
  expect(() => validateInput(['早餐', '100', '信用卡', 'ABC'])).toThrow(
    'user_error_invalid_params_length',
  );
  expect(() => validateInput(['早餐', '$100'])).toThrow('user_error_invalid_params_value');
  expect(validateInput(['早餐', '100'])).toEqual({
    type: 'create',
    params: {
      activity: dictionary[tags['早餐'].transaction_type],
      customized_tag: '早餐',
      customized_classification: tags['早餐'].classification,
      amount: 100,
      description: undefined,
    },
  });
  expect(validateInput(['早餐', '100', '100'])).toEqual({
    type: 'create',
    params: {
      activity: dictionary[tags['早餐'].transaction_type],
      customized_tag: '早餐',
      customized_classification: tags['早餐'].classification,
      amount: 100,
      description: '100',
    },
  });
});

test('fully creating record', () => {
  expect(() => validateInput(['支出'])).toThrow('user_error_invalid_params_length');
  expect(() => validateInput(['支出', '20240531'])).toThrow('user_error_invalid_params_length');
  expect(() => validateInput(['支出', '20240531', '早餐'])).toThrow(
    'user_error_invalid_params_length',
  );
  expect(() => validateInput(['支出', '20240531', '早餐', '100', '信用卡', 'ABC'])).toThrow(
    'user_error_invalid_params_length',
  );
  expect(() => validateInput(['支出', '1130531', '早餐', '100'])).toThrow(
    'user_error_invalid_params_value',
  );
  expect(() => validateInput(['支出', '20240531', '早安', '100'])).toThrow(
    'user_error_invalid_params_value',
  );
  expect(() => validateInput(['支出', '20240531', '薪水', '100'])).toThrow(
    'user_error_invalid_params_value',
  );
  expect(() => validateInput(['支出', '20240531', '早餐', '$100'])).toThrow(
    'user_error_invalid_params_value',
  );
  expect(validateInput(['支出', '20240531', '早餐', '100'])).toEqual({
    type: 'create',
    params: {
      activity: dictionary['支出'],
      customized_tag: '早餐',
      customized_classification: tags['早餐'].classification,
      amount: 100,
      description: undefined,
      accounting_date: formatDate('20240531'),
    },
  });
  expect(validateInput(['支出', '20240531', '早餐', '100', '100'])).toEqual({
    type: 'create',
    params: {
      activity: dictionary['支出'],
      customized_tag: '早餐',
      customized_classification: tags['早餐'].classification,
      amount: 100,
      description: '100',
      accounting_date: formatDate('20240531'),
    },
  });
});
