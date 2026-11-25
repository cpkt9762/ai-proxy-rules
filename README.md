# AI Proxy Rules

[![daily sync](https://img.shields.io/github/actions/workflow/status/VPSDance/ai-proxy-rules/generate.yml?branch=main&label=daily%20sync)](https://github.com/VPSDance/ai-proxy-rules/actions/workflows/generate.yml)
[![providers](https://img.shields.io/github/directory-file-count/VPSDance/ai-proxy-rules/data/sources?type=file&extension=yaml&label=providers)](./STATUS.md)
[![last update](https://img.shields.io/github/last-commit/VPSDance/ai-proxy-rules/main?label=last%20update)](https://github.com/VPSDance/ai-proxy-rules/commits/main)

AI 服务分流规则, 每日自动更新. 整合 v2fly, blackmatrix7 等上游并合并去重; 针对 OpenAI, Anthropic 等热门服务汇集更多来源, 补全遗漏并修正规则. 海外与中国 AI 服务分别汇总, 支持 Clash / Mihomo, sing-box, Surge, Shadowrocket, Loon, Stash, Quantumult X 和 Egern.

## 规则订阅

| 选择方式 | 规则集名称 |
| --- | --- |
| 按范围 | `all`: 全部; `global`: 海外; `cn`: 中国 |
| 按用途 | `coding`: 编程工具; `model`: 模型与 API; `media`: 图片, 视频和音频生成. 均含中国及海外服务 |
| 按地区和用途 | 用途名称前加 `global-` 或 `cn-`, 如 `global-coding`: 海外编程工具; `cn-coding`: 中国编程工具 |
| 按单个服务 | 如 `openai`, `anthropic`, 完整列表见[支持的服务](#支持的服务) |

以下是 `global` 规则集在各客户端中的订阅地址:

```text
https://cdn.jsdelivr.net/gh/VPSDance/ai-proxy-rules@main/rules/clash/global.yaml
https://cdn.jsdelivr.net/gh/VPSDance/ai-proxy-rules@main/rules/sing-box/global.json
https://cdn.jsdelivr.net/gh/VPSDance/ai-proxy-rules@main/rules/surge/global.list
https://cdn.jsdelivr.net/gh/VPSDance/ai-proxy-rules@main/rules/shadowrocket/global.list
https://cdn.jsdelivr.net/gh/VPSDance/ai-proxy-rules@main/rules/loon/global.list
https://cdn.jsdelivr.net/gh/VPSDance/ai-proxy-rules@main/rules/stash/global.list
https://cdn.jsdelivr.net/gh/VPSDance/ai-proxy-rules@main/rules/quantumult-x/global.list
https://cdn.jsdelivr.net/gh/VPSDance/ai-proxy-rules@main/rules/egern/global.yaml
```

订阅其他规则集时, 只需将地址中的 `global` 替换为表中的规则集名称, 保留文件后缀. 例如, Anthropic / Claude 的 Clash 订阅地址是:

```text
https://cdn.jsdelivr.net/gh/VPSDance/ai-proxy-rules@main/rules/clash/anthropic.yaml
```

把地址添加到客户端的规则订阅, rule-set 或 rule-provider 中. Clash / Mihomo 通过 rule-provider 引用时, 请设置 `behavior: classical`.

> 国内 jsDelivr 偶尔不稳定时, 可把 `cdn.jsdelivr.net` 替换为 `testingcf.jsdelivr.net`, `fastly.jsdelivr.net` 或 `cdn.jsdmirror.com` 等镜像.

## 分流顺序

规则从上往下匹配, 排在前面的规则优先. Clash / Mihomo 示例:

```yaml
rules:
  - RULE-SET,openai,AI-US        # OpenAI 使用 AI-US
  - RULE-SET,global,AI-OVERSEAS  # 其余海外 AI 服务使用 AI-OVERSEAS
```

`openai` / `global` 是已添加的规则集名称, `AI-US` / `AI-OVERSEAS` 替换为自己的节点或策略组名称.

## sing-box 域名 / IP 拆分与 SRS 二进制规则（Fork 扩展）

本 Fork（`cpkt9762/ai-proxy-rules`）在保留上游 `rules/sing-box/*.json` 完整规则的基础上，额外自动生成：

- `rules/sing-box-domain/<name>.json` 与 `rules/sing-box-domain/<name>.srs`：**仅保留域名规则**（`domain`、`domain_suffix`、`domain_keyword`、`domain_regex`，合并为单条无头规则），剔除 `ip_cidr` 与 `process_name`，可直接用于 `dns.rules`。
- `rules/sing-box-ip/<name>.json` 与 `rules/sing-box-ip/<name>.srs`：**仅保留 IP 段**（`ip_cidr`），方便路由规则将 IP 与域名彻底分离。
- `rules/sing-box/<name>.srs`：由完整版 `rules/sing-box/<name>.json` 编译得到的二进制 `.srs`，可直接用于 `route.rules`。

订阅示例（如 Anthropic / Claude 与全局海外 AI）：

```text
# DNS 专用纯域名（.srs 二进制）
https://cdn.jsdelivr.net/gh/cpkt9762/ai-proxy-rules@main/rules/sing-box-domain/anthropic.srs
https://cdn.jsdelivr.net/gh/cpkt9762/ai-proxy-rules@main/rules/sing-box-domain/global.srs

# 路由专用纯 IP / 完整规则（.srs 二进制）
https://cdn.jsdelivr.net/gh/cpkt9762/ai-proxy-rules@main/rules/sing-box-ip/anthropic.srs
https://cdn.jsdelivr.net/gh/cpkt9762/ai-proxy-rules@main/rules/sing-box/global.srs
```

sing-box `dns.rules` 与 `route.rules` 配合示例：

```json
{
  "dns": {
    "rules": [
      { "rule_set": ["ai-anthropic-domain"], "action": "route", "server": "claude-dns" },
      { "rule_set": ["ai-global-domain"], "action": "route", "server": "ai-dns" }
    ]
  },
  "route": {
    "rule_set": [
      {
        "tag": "ai-anthropic-domain",
        "type": "remote",
        "format": "binary",
        "url": "https://cdn.jsdelivr.net/gh/cpkt9762/ai-proxy-rules@main/rules/sing-box-domain/anthropic.srs"
      },
      {
        "tag": "ai-global-domain",
        "type": "remote",
        "format": "binary",
        "url": "https://cdn.jsdelivr.net/gh/cpkt9762/ai-proxy-rules@main/rules/sing-box-domain/global.srs"
      },
      {
        "tag": "ai-anthropic-ip",
        "type": "remote",
        "format": "binary",
        "url": "https://cdn.jsdelivr.net/gh/cpkt9762/ai-proxy-rules@main/rules/sing-box-ip/anthropic.srs"
      }
    ],
    "rules": [
      { "rule_set": ["ai-anthropic-domain", "ai-anthropic-ip"], "action": "route", "outbound": "Claude" },
      { "rule_set": ["ai-global-domain"], "action": "route", "outbound": "AIGC" }
    ]
  }
}
```

> CI/CD 自动化：除每日同步工作流（`.github/workflows/generate.yml`）会在同步后自动编译 `.srs` 外，独立工作流 `.github/workflows/singbox-srs.yml` 也会在 `rules/sing-box/*.json`、`data/providers/**` 或构建脚本变更（包括 GitHub Sync fork 合并上游更新）或手动触发时自动提取域名/IP 并编译提交 `.srs`。

## 支持的服务

<!-- provider-list:start -->

<details>
<summary>海外 AI 服务: <code>global</code></summary>

- OpenAI / ChatGPT (`openai`) - `coding` `model`
- Anthropic / Claude (`anthropic`) - `coding` `model`
- Google AI / Gemini / AI Studio / NotebookLM / Antigravity (`google-ai`) - `coding` `model`
- xAI / Grok (`x-ai`)
- Meta AI / Llama (`meta-ai`)
- Mistral AI / Le Chat (`mistral-ai`) - `model`
- Cohere (`cohere`) - `model`
- LMArena (`lmarena`) - `model`
- Hugging Face (`huggingface`) - `model`
- Groq (`groq`) - `model`
- OpenRouter (`openrouter`) - `model`
- Together AI (`together-ai`) - `model`
- Fireworks AI (`fireworks-ai`) - `model`
- Novita AI (`novita-ai`) - `model`
- Replicate (`replicate`) - `model`
- DeepInfra (`deepinfra`) - `model`
- Cerebras (`cerebras`) - `model`
- Chutes (`chutes`) - `model`
- Cloudflare AI (`cloudflare-ai`) - `model`
- H2O.ai (`h2o-ai`) - `model`
- Ollama (`ollama`) - `model`
- LM Studio (`lmstudio`) - `model`
- GitHub Copilot (`copilot`) - `coding`
- Cursor (`cursor`) - `coding`
- Zed (`zed`) - `coding`
- Windsurf / Codeium (`windsurf`) - `coding`
- JetBrains AI / Grazie (`jetbrains-ai`) - `coding`
- Augment Code (`augment-code`) - `coding`
- Command Code (`command-code`) - `coding`
- OpenCode (`opencode`) - `coding`
- Cline (`cline`) - `coding`
- Kilo (`kilo`) - `coding`
- Qoder (`qoder`) - `coding`
- Factory (`factory`) - `coding`
- Sourcegraph / Amp / Cody (`sourcegraph`) - `coding`
- Tabnine (`tabnine`) - `coding`
- Replit (`replit`) - `coding`
- Amazon Q Developer (`amazon-q`) - `coding`
- Kiro (`kiro`) - `coding`
- ByteDance AI / Trae / Coze / MarsCode / Cici (`bytedance-ai`) - `coding`
- Devin (`devin`) - `coding`
- v0 (`v0`) - `coding`
- Bolt.new (`bolt`) - `coding`
- Lovable (`lovable`) - `coding`
- Continue (`continue`) - `coding`
- CodeRabbit (`coderabbit`) - `coding`
- Manus (`manus`) - `coding`
- Dify (`dify`) - `coding`
- LangChain (`langchain`) - `coding`
- CrewAI (`crewai`) - `coding`
- Midjourney (`midjourney`) - `media`
- Stability AI (`stability-ai`) - `media`
- Black Forest Labs / FLUX (`black-forest-labs`) - `media`
- Ideogram (`ideogram`) - `media`
- Adobe Firefly (`adobe-firefly`) - `media`
- Leonardo AI (`leonardo-ai`) - `media`
- Recraft (`recraft`) - `media`
- Lovart (`lovart`) - `media`
- OpenArt (`openart`) - `media`
- ClipDrop (`clipdrop`) - `media`
- ComfyUI (`comfyui`) - `media`
- Civitai (`civitai`) - `media`
- Suno (`suno`) - `media`
- Udio (`udio`) - `media`
- Runway (`runway`) - `media`
- Pika (`pika`) - `media`
- Luma AI (`luma-ai`) - `media`
- HeyGen (`heygen`) - `media`
- Synthesia (`synthesia`) - `media`
- Descript (`descript`) - `media`
- Phind (`phind`)
- Gamma (`gamma`)
- Perplexity (`perplexity`)
- You.com (`you`)
- Genspark (`genspark`)
- Poe (`poe`)
- Character.AI (`character-ai`)
- Inflection / Pi (`inflection`)
- DuckDuckGo AI (`duck-ai`)
- Dia Browser (`dia-browser`)
- ElevenLabs (`elevenlabs`) - `media`
- Otter.ai (`otter-ai`)
- Grammarly (`grammarly`)
- Jasper (`jasper`)
- YouMind (`youmind`)
- OpenClaw (`openclaw`)
- Hermes Agent (`hermes-agent`)
- Eigent (`eigent`)

</details>

<details>
<summary>中国 AI 服务: <code>cn</code></summary>

- DeepSeek (`deepseek`): 深度求索 - `model`
- MiniMax (`minimax`): 稀宇科技 / 海螺 AI / 星野 - `model` `media`
- Moonshot AI / Kimi (`moonshot-ai`): 月之暗面 / Kimi - `model`
- StepFun (`stepfun`): 阶跃星辰 - `model`
- Zhipu AI / GLM (`zhipu-ai`): 智谱 AI / GLM - `model`
- SiliconFlow (`siliconflow`): 硅基流动 - `model`
- PPIO (`ppio`): 派欧云 - `model`
- Alibaba Cloud Model Studio / Qwen / Qoder China (`alibaba-ai`): 阿里云百炼 / 通义千问 / Qoder 国内版 - `coding` `model`
- ModelScope (`modelscope`): 魔搭社区 - `model`
- Baidu Qianfan / ERNIE (`baidu-ai`): 百度千帆 / 文心一言 - `model`
- Tencent Hunyuan / Yuanbao / Yuanqi (`tencent-ai`): 腾讯混元 / 元宝 / 元器 - `model` `media`
- Volcengine Ark / Doubao (`volcengine-ai`): 火山引擎方舟 / 豆包 - `model`
- ByteDance AI (China) / Trae / Coze / MarsCode (`bytedance-ai-cn`): 字节跳动 / Trae / 扣子 / MarsCode - `coding`
- Xiaomi AI / MiMo (`xiaomi-ai`): 小米 AI / MiMo - `model`

</details>

<!-- provider-list:end -->

## 目录结构

```text
data/sources/   人工维护的来源配置
data/providers/ 由 data/sources/ 生成的 Provider 数据
data/cache/     上游响应缓存, 上游故障时作为兜底
scripts/        同步与生成脚本
rules/          自动生成的规则文件
```

## 维护

安装依赖:

```bash
pnpm install
```

生成规则:

```bash
pnpm sync
pnpm generate
```

验证:

```bash
pnpm check
pnpm test
```

GitHub Actions 会在影响规则生成的文件变化时自动运行同步, 检查和生成, 并在 `data/` 或 `rules/` 有变化时提交生成结果.

## References

- https://github.com/xiaolai/anthropic-claude-surge-rules-set
- https://ip.net.coffee/claude/site.html
- https://docs.anthropic.com/en/api/ip-addresses
- https://bgp.he.net/net/160.79.104.0/23#_dnsrecords
- https://bgp.he.net/net/2607:6bc0::/48#_dnsrecords
- https://github.com/blackmatrix7/ios_rule_script
- https://github.com/v2fly/domain-list-community
- https://github.com/SkywalkerJi/Clash-Rules
