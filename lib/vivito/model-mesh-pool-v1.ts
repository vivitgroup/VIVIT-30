import type {VivitoMeshModel} from "./model-mesh-v1";

export const VIVITO_DEFAULT_MODEL_POOL:VivitoMeshModel[]=[
  {id:"kimi-direct-k2.6",provider:"moonshot",model:"kimi-k2.6",baseUrl:"https://api.moonshot.ai/v1",apiKeyEnv:"MOONSHOT_API_KEY",quality:91,cost:48,latency:46,tasks:["general","reasoning","research","creative","arabic"],maxTokens:8192},
  {id:"deepseek-direct-v4-flash",provider:"deepseek",model:"deepseek-v4-flash",baseUrl:"https://api.deepseek.com",apiKeyEnv:"DEEPSEEK_API_KEY",quality:92,cost:24,latency:34,tasks:["general","reasoning","finance","research","coding"],maxTokens:8192},
  {id:"deepseek-direct-v4-pro",provider:"deepseek",model:"deepseek-v4-pro",baseUrl:"https://api.deepseek.com",apiKeyEnv:"DEEPSEEK_API_KEY",quality:95,cost:43,latency:55,tasks:["reasoning","finance","research","coding"],maxTokens:8192},
  {id:"mistral-direct-large",provider:"mistral",model:"mistral-large-latest",baseUrl:"https://api.mistral.ai/v1",apiKeyEnv:"MISTRAL_API_KEY",quality:89,cost:58,latency:42,tasks:["general","reasoning","creative","research","arabic"],maxTokens:8192},
  {id:"mistral-direct-small",provider:"mistral",model:"mistral-small-latest",baseUrl:"https://api.mistral.ai/v1",apiKeyEnv:"MISTRAL_API_KEY",quality:78,cost:18,latency:20,tasks:["general","creative","arabic"],maxTokens:8192},
  {id:"groq-gpt-oss-120b",provider:"groq",model:"openai/gpt-oss-120b",baseUrl:"https://api.groq.com/openai/v1",apiKeyEnv:"GROQ_API_KEY",quality:88,cost:28,latency:8,tasks:["general","reasoning","coding","research"],maxTokens:8192},
  {id:"groq-gpt-oss-20b",provider:"groq",model:"openai/gpt-oss-20b",baseUrl:"https://api.groq.com/openai/v1",apiKeyEnv:"GROQ_API_KEY",quality:76,cost:12,latency:5,tasks:["general","coding"],maxTokens:8192},
  {id:"groq-llama-3.1-8b",provider:"groq",model:"llama-3.1-8b-instant",baseUrl:"https://api.groq.com/openai/v1",apiKeyEnv:"GROQ_API_KEY",quality:68,cost:7,latency:3,tasks:["general","creative"],maxTokens:8192},
  {id:"together-gpt-oss-20b",provider:"together",model:"openai/gpt-oss-20b",baseUrl:"https://api.together.ai/v1",apiKeyEnv:"TOGETHER_API_KEY",quality:76,cost:14,latency:22,tasks:["general","coding","reasoning"],maxTokens:8192},
  {id:"fireworks-deepseek-v3p1",provider:"fireworks",model:"accounts/fireworks/models/deepseek-v3p1",baseUrl:"https://api.fireworks.ai/inference/v1",apiKeyEnv:"FIREWORKS_API_KEY",quality:86,cost:25,latency:20,tasks:["general","reasoning","coding","research","finance"],maxTokens:8192},

  {id:"or-kimi-latest",provider:"openrouter",model:"~moonshotai/kimi-latest",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:94,cost:55,latency:48,tasks:["reasoning","research","creative","coding","arabic"],maxTokens:8192},
  {id:"or-qwen3.6-27b",provider:"openrouter",model:"qwen/qwen3.6-27b",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:82,cost:10,latency:24,tasks:["general","reasoning","coding","arabic"],maxTokens:8192},
  {id:"or-qwen3-235b-a22b",provider:"openrouter",model:"qwen/qwen3-235b-a22b",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:89,cost:31,latency:45,tasks:["reasoning","research","coding","finance"],maxTokens:8192},
  {id:"or-qwen2.5-72b",provider:"openrouter",model:"qwen/qwen-2.5-72b-instruct",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:82,cost:20,latency:31,tasks:["general","creative","arabic"],maxTokens:8192},
  {id:"or-qwen2.5-coder-32b",provider:"openrouter",model:"qwen/qwen-2.5-coder-32b-instruct",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:83,cost:18,latency:27,tasks:["coding"],maxTokens:8192},
  {id:"or-deepseek-r1",provider:"openrouter",model:"deepseek/deepseek-r1",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:90,cost:30,latency:52,tasks:["reasoning","finance","research","coding"],maxTokens:8192},
  {id:"or-llama-3.1-8b",provider:"openrouter",model:"meta-llama/llama-3.1-8b-instruct",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:68,cost:6,latency:18,tasks:["general","creative"],maxTokens:8192},
  {id:"or-llama-3.2-3b",provider:"openrouter",model:"meta-llama/llama-3.2-3b-instruct",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:61,cost:3,latency:12,tasks:["general"],maxTokens:8192},
  {id:"or-mistral-small-3.1-24b",provider:"openrouter",model:"mistralai/mistral-small-3.1-24b-instruct",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:78,cost:12,latency:22,tasks:["general","creative","arabic"],maxTokens:8192},
  {id:"or-mistral-nemo",provider:"openrouter",model:"mistralai/mistral-nemo",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:69,cost:7,latency:18,tasks:["general","creative"],maxTokens:8192},
  {id:"or-gemma-3-27b",provider:"openrouter",model:"google/gemma-3-27b-it",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:73,cost:9,latency:23,tasks:["general","creative","arabic"],maxTokens:8192},
  {id:"or-command-a",provider:"openrouter",model:"cohere/command-a",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:79,cost:35,latency:30,tasks:["research","general","arabic"],maxTokens:8192},
  {id:"or-reka-flash-3",provider:"openrouter",model:"rekaai/reka-flash-3",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:74,cost:8,latency:17,tasks:["general","reasoning","creative"],maxTokens:8192},
  {id:"or-nemotron-3-nano-free",provider:"openrouter",model:"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:70,cost:0,latency:35,tasks:["general","reasoning","research"],maxTokens:8192},
  {id:"or-laguna-s-2.1-free",provider:"openrouter",model:"poolside/laguna-s-2.1:free",baseUrl:"https://openrouter.ai/api/v1",apiKeyEnv:"OPENROUTER_API_KEY",quality:78,cost:0,latency:34,tasks:["coding","reasoning"],maxTokens:8192}
];

export const VIVITO_DEFAULT_MODEL_POOL_META={
  version:"2026-08-27",
  modelCount:VIVITO_DEFAULT_MODEL_POOL.length,
  providers:[...new Set(VIVITO_DEFAULT_MODEL_POOL.map(m=>m.provider))],
  requiredKeyEnvs:[...new Set(VIVITO_DEFAULT_MODEL_POOL.map(m=>m.apiKeyEnv))]
};
