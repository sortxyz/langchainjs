import { LangChainPlusClient } from "langchainplus-sdk";
import { BaseRun, RunCreate, RunUpdate } from "langchainplus-sdk/schemas";
import {
  getEnvironmentVariable,
  getRuntimeEnvironment,
} from "../../util/env.js";
import { BaseTracer } from "./tracer.js";
import { BaseCallbackHandlerInput } from "../base.js";

export interface Run extends BaseRun {
  id: string;
  child_runs: this[];
  child_execution_order: number;
}

export interface LangChainTracerFields extends BaseCallbackHandlerInput {
  exampleId?: string;
  sessionName?: string;
  client?: LangChainPlusClient;
}

export class LangChainTracer
  extends BaseTracer
  implements LangChainTracerFields
{
  name = "langchain_tracer";

  sessionName?: string;

  exampleId?: string;

  client: LangChainPlusClient;

  constructor(fields: LangChainTracerFields = {}) {
    super(fields);
    const { exampleId, sessionName, client } = fields;

    this.sessionName =
      sessionName ?? getEnvironmentVariable("LANGCHAIN_SESSION");
    this.exampleId = exampleId;
    this.client = client ?? new LangChainPlusClient({});
  }

  private async _convertToCreate(
    run: Run,
    example_id: string | undefined = undefined
  ): Promise<RunCreate> {
    return {
      ...run,
      extra: {
        ...run.extra,
        runtime: await getRuntimeEnvironment(),
      },
      child_runs: undefined,
      session_name: this.sessionName,
      reference_example_id: run.parent_run_id ? undefined : example_id,
    };
  }

  protected async persistRun(_run: Run): Promise<void> {}

  protected async _persistRunSingle(run: Run): Promise<void> {
    const persistedRun: RunCreate = await this._convertToCreate(
      run,
      this.exampleId
    );
    await this.client.createRun(persistedRun);
  }

  protected async _updateRunSingle(run: Run): Promise<void> {
    const runUpdate: RunUpdate = {
      end_time: run.end_time,
      error: run.error,
      outputs: run.outputs,
    };
    await this.client.updateRun(run.id, runUpdate);
  }

  async onLLMStart(run: Run): Promise<void> {
    await this._persistRunSingle(run);
  }

  async onLLMEnd(run: Run): Promise<void> {
    await this._updateRunSingle(run);
  }

  async onLLMError(run: Run): Promise<void> {
    await this._updateRunSingle(run);
  }

  async onChainStart(run: Run): Promise<void> {
    await this._persistRunSingle(run);
  }

  async onChainEnd(run: Run): Promise<void> {
    await this._updateRunSingle(run);
  }

  async onChainError(run: Run): Promise<void> {
    await this._updateRunSingle(run);
  }

  async onToolStart(run: Run): Promise<void> {
    await this._persistRunSingle(run);
  }

  async onToolEnd(run: Run): Promise<void> {
    await this._updateRunSingle(run);
  }

  async onToolError(run: Run): Promise<void> {
    await this._updateRunSingle(run);
  }
}
