import { defineFeature, loadFeature } from 'jest-cucumber';
import * as fs from 'fs-extra';
import * as os from 'os';
import { join } from 'path';
import { FileService } from '../../../src/service/file.service';
import { GetController } from '../../../src/controller/get.controller';
import { GetView } from '../../../src/view/get.view';

beforeAll(() => {
  jest.resetAllMocks();
});

jest.mock('../../../src/service/faas.service', () =>
  jest.requireActual('../../__mocks__/faas.service.ts'),
);
jest.mock('../../../src/service/faasFactory.service', () =>
  jest.requireActual('../../__mocks__/faasFactory.service.ts'),
);

const feature = loadFeature('test/commands/get/get.feature');

const testDir = join(__dirname, 'test');
const fileService = new FileService({ cwd: testDir });

defineFeature(feature, (test) => {
  let consoleSpy;

  beforeEach(() => {
    fs.ensureDirSync(testDir);
    consoleSpy = jest.spyOn(global.console, 'log').mockImplementation();
    jest.spyOn(os, 'tmpdir').mockReturnValue(testDir);
  });

  afterEach(() => {
    jest.resetAllMocks();
    consoleSpy = undefined;
  });

  afterAll(() => {
    fs.removeSync(testDir);
  });

  test('Run the Get command for all resources', ({ given, when, then }) => {
    const cliUx = {
      table: jest.fn(),
    };
    const getView = new GetView({ cliUx });

    given('I am authorized', async () => {
      await fileService.writeTempFile({
        '123456789': {
          token: '454545478787',
          userId: 'userId_123456789',
          username: 'testUser@liveperson.com',
          active: true,
        },
      });
    });

    when(
      'I run the get command with functions/deployments/account/events parameter',
      async () => {
        const getController = new GetController({ getView });
        await getController.get({
          domains: ['functions', 'deployments', 'account', 'events'],
        });
      },
    );

    then(
      'It should display information about functions/deployments/account/events',
      () => {
        expect(JSON.stringify(cliUx.table.mock.calls[0])).toContain(
          'TestFunction1',
        );
        expect(JSON.stringify(cliUx.table.mock.calls[0])).toContain('Draft');
        expect(JSON.stringify(cliUx.table.mock.calls[0])).toContain(
          'bot_connectors_error_hook',
        );
        expect(JSON.stringify(cliUx.table.mock.calls[1])).toContain(
          'TestFunction2',
        );
        expect(JSON.stringify(cliUx.table.mock.calls[1])).toContain(
          'Undeployed changes from',
        );
        expect(consoleSpy).toBeCalledWith(
          expect.stringMatching(/0% \(Invocations since/),
        );
      },
    );
  });

  test('Run the Get command for a non existing resource', ({
    given,
    when,
    then,
  }) => {
    given('I am authorized', async () => {
      await fileService.writeTempFile({
        '123456789': {
          token: '454545478787',
          userId: 'userId_123456789',
          username: 'testUser@liveperson.com',
          active: true,
        },
      });
    });

    when('I run the get command with an incorrect parameter', async () => {
      const getController = new GetController();
      await getController.get({ domains: ['incorrectParam'] });
    });

    then('It should display an error', () => {
      expect(consoleSpy).toBeCalledWith(
        expect.stringMatching(
          /Unsupported domain found. Only functions, deployments and account are supported!/,
        ),
      );
    });
  });

  test('Run the Get command with no domain provided', ({
    given,
    when,
    then,
  }) => {
    given('I am authorized', async () => {
      await fileService.writeTempFile({
        '123456789': {
          token: '454545478787',
          userId: 'userId_123456789',
          username: 'testUser@liveperson.com',
          active: true,
        },
      });
    });

    when('I run the get command with no domain provided', async () => {
      const getController = new GetController();
      await getController.get({ domains: [] });
    });

    then('It should display an error', () => {
      expect(consoleSpy).toBeCalledWith(
        expect.stringMatching(/Please provide a domain/),
      );
    });
  });

  test('Run the Get command for all resources for an account without lambdas', ({
    given,
    when,
    then,
  }) => {
    given('I am authorized', async () => {
      await fileService.writeTempFile({
        '1234567890': {
          token: '454545478787',
          userId: 'userId_1234_NoLambdas',
          username: 'testUser@liveperson.com',
          active: true,
        },
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    given('I have no lambdas in my account', () => {});

    when(
      'I run the get command with functions/deployments/account/events parameter',
      async () => {
        const getController = new GetController();
        await getController.get({ domains: ['account'] });
      },
    );

    then('It should display an error', () => {
      expect(consoleSpy).toBeCalledWith(
        expect.stringMatching(/There are no functions created on your account/),
      );
    });
  });
});
