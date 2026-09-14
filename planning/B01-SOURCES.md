# B01 · 照片分类样例来源与主张索引

> [INPUT]: [B01-SCOPE](B01-SCOPE.md)、[NODE-MODEL](NODE-MODEL.md)，以及下表实际核对的一手资料和辅助讲义。
> [OUTPUT]: 已核对的资料坐标、逐主张/关系依据、使用边界与未知项。
> [POS]: planning 的公开来源阅读记录；产品正文及来源字段以 data/entries 为正本。
> [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

本文件是 2026-09-13 整理的公开阅读版本，不是内部来源审查原稿的逐字副本。保留原来源、主张、关系与权利边界，只更新过期的实施流程状态；不沿用原稿摘要标识本版本，也不把文档整理算作新的原站访问。

资料实际核对日期：**2026-09-13**。范围为照片分类、四个子问题、指定 TorchVision 0.23 实现与 V2 权重；存储与 HTTP/2 不属于本批资料调查。来源范围已独立核对；未安装 PyTorch/TorchVision、下载权重、运行图片推理或复现实验。本文件的主张 ID 与正式内容对应，教学情境中的通过结果仍是虚构假设。

## 资料坐标与保留范围

每条资料均仅保留链接、事实性书目信息、位置和本项目原创解释；第三方全文、代码段、图表、图片、完整类别表与权重文件不进入本批候选。`checkedAt` 只表示核对了所列位置，不表示全文审核或永久可用。版本化 URL 不是内容哈希；未保存原件不填写伪造路径或摘要。

| ID | 资料、发布者与固定坐标 | 本轮实际核对位置 / 来源角色 | 使用与分发决定 |
|---|---|---|---|
| S01 | [ResNet 原论文](https://arxiv.org/html/1512.03385v1)，Kaiming He、Xiangyu Zhang、Shaoqing Ren、Jian Sun；arXiv 1512.03385v1，2015-12-10 | §3.1—3.3、Table 1、§4.1；方法提出与架构规格的一手论文 | [该版本许可](https://arxiv.org/licenses/nonexclusive-distrib/1.0/license.html)为 arXiv 非独占发布许可；未取得对 Atlas 的全文/图表再分发授权。仅目录与原创说明。 |
| S02 | [resnet50 文档](https://docs.pytorch.org/vision/0.23/models/generated/torchvision.models.resnet50.html)，TorchVision；文档 0.23 | Note、ResNet50_Weights.IMAGENET1K_V2 与 transforms；框架行为及发布方指标的一手文档 | 仅目录与原创说明；页面文字/图像再分发许可未单独核定。其模型使用条款不能由软件许可推断。 |
| S03 | [resnet.py](https://raw.githubusercontent.com/pytorch/vision/v0.23.0/torchvision/models/resnet.py)，pytorch/vision；tag v0.23.0 | Bottleneck、_resnet、ResNet50_Weights、resnet50；与 [0.23 源码文档](https://docs.pytorch.org/vision/0.23/_modules/torchvision/models/resnet.html)交叉核对 | [v0.23.0 LICENSE](https://github.com/pytorch/vision/blob/v0.23.0/LICENSE) 为 BSD-3-Clause，代码复用需保留声明等义务；本批未复制代码，不据此授权权重。 |
| S04 | [模型与预训练权重总览](https://docs.pytorch.org/vision/0.23/models.html)，TorchVision；文档 0.23 | General information、Initializing、Using、Classification 示例；一手使用说明 | 仅目录与原创说明。总览明确预训练模型可能有训练数据引出的独立条件；指定权重的具体使用/再分发依据仍未核定。 |
| S05 | [ImageClassification 源码](https://raw.githubusercontent.com/pytorch/vision/v0.23.0/torchvision/transforms/_presets.py)，pytorch/vision；tag v0.23.0 | ImageClassification.__init__/forward；本轮变换顺序的一手实现 | BSD-3-Clause 范围同 S03；仅链接与原创说明。类属内部 API，用户入口应是 weights.transforms()。 |
| S06 | [类别元数据源码](https://raw.githubusercontent.com/pytorch/vision/v0.23.0/torchvision/models/_meta.py)，pytorch/vision；tag v0.23.0 | _IMAGENET_CATEGORIES 声明；与 S03 _COMMON_META、S04 Classification 中 categories 取法相连 | 只保留类别表身份与定位，不复制完整表；不让读者依赖私有变量，使用 weights.meta["categories"]。 |
| S07 | [作者 README](https://github.com/KaimingHe/deep-residual-networks/blob/a7026cb6d478e131b765b898c312e25f9f6dc031/README.md)，He、Zhang、Ren、Sun / MSRA；提交 `a7026cb6d478e131b765b898c312e25f9f6dc031`（2016-07-29），2026-09-13 读取 | README 第 15—17、35—39 行：Introduction、Disclaimer and known issues 第 0—2 项；作者对发布物的一手说明 | [仓库 MIT 许可](https://github.com/KaimingHe/deep-residual-networks/blob/a7026cb6d478e131b765b898c312e25f9f6dc031/LICENSE)，署名 Shaoqing Ren 2016；本批仅目录与原创说明，不据仓库许可断言外链模型权重均可再分发。README 与 LICENSE 均已从该提交重新读取。 |
| S08 | [Conv2d 文档](https://docs.pytorch.org/docs/2.8/generated/torch.nn.Conv2d.html)，PyTorch；文档 2.8 | 运算定义、kernel_size/stride/padding、weight；卷积算子的一手接口说明 | 仅目录与原创说明；用于解释运算，不宣称 2.8 与本机环境已兼容或已安装。 |
| S09 | [CS231n 卷积网络讲义](https://cs231n.github.io/convolutional-networks/)，Stanford CS231n；未编号网页，2026-09-13 阅读记录 | Convolutional Layer：Local Connectivity、Parameter Sharing；辅助组织直观解释 | 仅链接与原创说明；未核定图文镜像许可。它是教学解释来源，不替代 ResNet 原论文或具体版本接口依据。 |
| S10 | [resize 文档](https://docs.pytorch.org/vision/0.23/generated/torchvision.transforms.functional.resize.html)，TorchVision；文档 0.23 | size 参数：单值/单元素序列对应短边，保持宽高比 | 仅目录与原创说明；用于补足 S05 调用 resize 的尺寸语义，页面原文再分发许可未核定。 |

S03/S05/S06 的 `v0.23.0` tag 已通过 GitHub 只读接口解析为提交 `824e8c8726b65fd9d5abdc9702f81c2b0c4c0dc8`。固定提交属于源代码版本身份，不是任何权重文件的内容摘要。

S03 的权重枚举指向 `resnet50-11ad3fa6.pth`，地址保存在内容候选的权重对象中；**这只是发布方列出的文件标识**。权重未请求/下载，内容哈希、文件可得性、可执行性与用途许可均未知。文件名中的 `11ad3fa6` 不写作完整哈希。

许可判断的额外一手依据为 [arXiv Permissions and Reuse](https://info.arxiv.org/help/license/reuse.html) 的全文复用说明及 S04 的模型条款提示，均于本日实际核对。第三方许可不被本仓库 CC BY-SA 4.0 覆盖；本轮只公开必要来源事实和本项目原创说明，未援引概括的“教育用途”作为复制许可。

## 逐主张与受影响对象

下面只保存审核命题与位置；面向读者的中文解释由内容候选进入正式数据。对象短名对应 `b01:` 命名空间；CNN 关联现有 raw 1453，不创建 raw 节点。

| 主张 ID | 待写入的最小事实 / 本项目解释范围 | 资料与定位 | 影响对象 / 不支持的结论 |
|---|---|---|---|
| C01 | 卷积层对局部窗口使用同一组可学习参数；CNN 的图片例子以此解释局部处理和共享。 | S08 运算定义/weight；S09 Local Connectivity/Parameter Sharing | cnn；“小窗口检查器”是本项目比喻，不表示每个卷积核都有可命名含义，不声称每种 CNN 只处理图片。 |
| C02 | 原图像 ResNet 用残差分支与快捷连接组织卷积网络。 | S01 §3.1—3.3 | resnet、cnn；家族细分是对本轮图像架构的组织解释，不把论文当 CNN 实例。 |
| C03 | 原论文 ResNet-50 是 ResNet 家族中的特定架构规格。 | S01 Table 1、§4.1 的 Deeper Bottleneck Architectures | resnet50、resnet；规格不等于训练参数，不把 50 写成 50 个残差块。 |
| C04 | TorchVision resnet50 的降采样步长放在瓶颈第二个 3×3 卷积，文档称 V1.5；原论文位置为第一个 1×1 卷积。 | S02 Note；S03 Bottleneck / resnet50 | resnet50-v15、tv-resnet50-023；不据文档的精度描述承诺目标照片上更好。 |
| C05 | 指定实现构建瓶颈网络并可加载枚举所指参数；未给权重参数时不自动取得训练后模型。 | S03 resnet50 / _resnet；S02 参数说明 | tv-resnet50-023；只证明代码连接，未证明本项目安装、下载、加载或推理成功。 |
| C06 | IMAGENET1K_V2 是指定实现可选择的一组权重；0.23 的 DEFAULT 指向它，但 DEFAULT 不是跨版本固定身份。 | S03 ResNet50_Weights；S04 Initializing | tv-resnet50-v2-weights；数据存显式枚举和文件名，不只存 DEFAULT。 |
| C07 | V2 的配套变换为双线性缩放短边至 232、中心裁切至 224×224、转换数值再逐通道归一化；归一化参数以该版本资料为准。 | S02 V2 transforms；S05 ImageClassification；S10 size | tv-v2-preprocess；不沿用 V1 的 256；变换不自动替使用者决定 RGB/灰度/透明通道的输入语义。 |
| C08 | 该实现起始卷积接收 3 通道；本样例输入条件为已解码的 RGB，张量通道/形状/数值范围需核对。 | S03 ResNet.__init__；S05 forward；S08 Shape | tv-v2-preprocess；未知图片格式不视为满足条件，不发布安装或图像转换教程。 |
| C09 | 输出位置须按同一权重的 categories 顺序转为类别；预训练输出对应 ImageNet-1K 的 1,000 类。 | S03 _COMMON_META / _resnet；S06 _IMAGENET_CATEGORIES；S04 Classification | tv-v2-labels、tv-resnet50-v2-weights；目标 SKU 不在类别语义里时，输出正常也不能判目标达成。后半是本项目基于接口限制的推论。 |
| C10 | 推理需使用所选权重的预处理；官方分类例子将模型设为 eval 并用类别索引解释输出。 | S04 Using / Classification | tv-resnet50-023、方案连接；这是资料中的用法，未执行示例，未把 softmax 分数称为经校准的正确概率。 |
| C11 | 作者仓库发布原论文模型的 Caffe 转换物，供测试/微调；作者说明这些模型不是用该 Caffe 版本训练。 | S07 Introduction、Disclaimer 0—2 | author-caffe-release；不能叫完整原始训练代码，不能默认为 TorchVision 权重兼容。 |
| C12 | ResNet v1 论文提出并评估家族及架构；作者/框架发布物是不同身份。 | S01 §3、Table 1、§4.1；S07 Introduction；S02/S03 发布方 | resnet-paper、resnet、resnet50；非“CNN 唯一原论文”，也非 Atlas 的复现报告。 |
| C13 | 指标只可归属于发布方的指定评估；V2 文档给出 ImageNet-1K 单裁切 top-1 80.858%。 | S02 V2 指标；S04 Classification 表说明 | tv-resnet50-v2-weights；不用于估计本次照片准确率，不与论文不同设置直接排名。候选正文可省略该数字。 |
| C14 | 标签、输入、推理、结果判断分别覆盖一个子问题；20 张至少 18 张 top-1 匹配且逐张查错为虚构情境判据。 | NODE-MODEL §12 A 与 B01-SCOPE；本项目教学情境 | photo-classify、方案/场景；不是文献标准、专业建议或实测结果。 |
| C15 | 必要条件未知先确认；标签不匹配使该变体不适用；一次调用通过不自动使问题结果通过。 | NODE-MODEL §11—13；C09 的接口边界 | 两个虚构情境与商品 SKU 反例；不从页面访问推断用户采用/学会，不保存个人状态。 |

S09 仅帮助构造 C01 的感性解释；关键实现参数回 S02—S08。原 TensorFlow CNN 教程本次未重新打开，不追加核对日期；可继续作为既有延伸入口，不能进入以上新主张的已核依据。

## 逐关系索引

正反方向使用同一条关系记录生成。不存在的新关系记“新增”，不向旧 `concepts.r` 填造节点；CNN 既有正文扩充后，旧地址保持。下表是 P03 的写入交接，不是已实现关系。

| 关系 ID | 原关系 → 候选关系 | 主张依据 / 限定 |
|---|---|---|
| R01 | 新增：resnet → 家族细分于 → cnn | C01/C02；限原图像 ResNet 系列。 |
| R02 | 新增：resnet50 → 架构规格属于 → resnet | C03；家族与特定规格区分。 |
| R03 | 新增：resnet50-v15 → 架构变体于 → resnet50 | C04；步长位置差异。 |
| R04 | 新增：tv-resnet50-023 → 实现 → resnet50-v15 | C04/C05；框架方实现，不合并为论文作者发布物。 |
| R05 | 新增：tv-resnet50-v2-weights → 适配加载于 → tv-resnet50-023 | C05/C06；资料所述连接，加载未实测。 |
| R06 | 新增：resnet-paper → 提出并评估 → resnet | C02/C12；方法/家族证据范围。 |
| R07 | 新增：resnet-paper → 提出并评估 → resnet50 | C03/C12；具体架构证据范围，与 R06 分开。 |
| R08 | 新增：author-caffe-release → 转换发布 → resnet50 | C11；作者所述原论文模型的 Caffe 转换物，不保证任意格式互换。 |
| R09 | 新增：tv-resnet50-v2-weights → 配套预处理 → tv-v2-preprocess | C06/C07/C08；232/224、通道/数值约束保留。 |
| R10 | 新增：tv-resnet50-v2-weights → 配套类别顺序 → tv-v2-labels | C09；不复制完整类别表；同权重类别身份。 |

覆盖与连接依据：labels→类别映射为 C09；input→预处理为 C07/C08；inference→推理为 C05/C06/C10；useful-result→评估为 C14/C15。推理角色中 CNN/ResNet/架构是“解释结构”，实现和权重是“实际承担”，不能用相同绑定用途。角色间有“RGB 图片→预处理张量→类别分数→类别名称与分数→目标样本判断”的明确数据流。

## 复核入口与未知项

现行正文与来源保存在 data/entries，objects/problems/solutions/scenarios/mappings 定义引用同一正文；来源通过 ID 反查受影响的主张与关系。以下未决项在编译和阅读中仍须保留原有边界：

- 来源失效：保留本次查看日期/版本/位置，新的可得性检查为失败或未知；不改为事实已反证。
- 版本替换：V1、V2、DEFAULT 或文档版本变化要建立新绑定/检查；旧 C07 不自动支撑新预处理。
- 证据冲突：原论文与 V1.5 的步长差异按两个对象表达，不能投票合并或抹平差异。
- 权利未核定：原件和权重不进入公开包；资料目录和本项目原创解释仍可进入候选。
- 资料缺失：CNN 历史原始论文未作系统调查；TensorFlow 旧教程本次未复核；这些都不能写成“没有来源”。作者仓库已固定提交，但本轮没有评估它的当前维护活跃度。
- 实际执行缺失：本项目未执行模型加载、图片推理或实验复现；公开虚构情境中的“调用通过”只能显式标为教学假设，禁止显示成本项目实测或访问者状态。

来源与逐主张范围已经独立审核，并由正式数据和编译结果保留。代码检查、页面验证、模型执行与真实用户试读分别留证：本记录不把程序检查或教学情境中的调用通过写成模型实测或用户理解。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
