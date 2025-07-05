<template>
  <el-dialog 
    v-model="visible" 
    :title="dialogTitle" 
    width="600px"
    @close="handleClose"
  >
    <el-form 
      ref="formRef" 
      :model="form" 
      :rules="formRules" 
      label-width="120px"
    >
      <!-- 预约使用 -->
      <template v-if="action === 'reserve'">
        <el-form-item label="预约开始时间" prop="startTime">
          <el-date-picker
            v-model="form.startTime"
            type="datetime"
            placeholder="选择预约开始时间"
            style="width: 100%"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="预约结束时间" prop="endTime">
          <el-date-picker
            v-model="form.endTime"
            type="datetime"
            placeholder="选择预约结束时间"
            style="width: 100%"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="使用目的" prop="purpose">
          <el-input
            v-model="form.purpose"
            type="textarea"
            rows="3"
            placeholder="请描述设备使用目的"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </template>

      <!-- 故障报修 -->
      <template v-if="action === 'maintenance'">
        <el-form-item label="故障类型" prop="faultType">
          <el-select v-model="form.faultType" placeholder="请选择故障类型" style="width: 100%">
            <el-option label="硬件故障" value="硬件故障" />
            <el-option label="软件故障" value="软件故障" />
            <el-option label="操作异常" value="操作异常" />
            <el-option label="性能下降" value="性能下降" />
            <el-option label="其他问题" value="其他问题" />
          </el-select>
        </el-form-item>
        <el-form-item label="紧急程度" prop="urgency">
          <el-radio-group v-model="form.urgency">
            <el-radio label="低">低</el-radio>
            <el-radio label="中">中</el-radio>
            <el-radio label="高">高</el-radio>
            <el-radio label="紧急">紧急</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="故障描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            rows="4"
            placeholder="请详细描述故障现象和影响"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="联系电话" prop="contactPhone">
          <el-input 
            v-model="form.contactPhone" 
            placeholder="请输入联系电话" 
            maxlength="20"
          />
        </el-form-item>
      </template>

      <!-- 申请清洁 -->
      <template v-if="action === 'cleaning'">
        <el-form-item label="清洁类型" prop="cleaningType">
          <el-select v-model="form.cleaningType" placeholder="请选择清洁类型" style="width: 100%">
            <el-option label="日常清洁" value="日常清洁" />
            <el-option label="深度清洁" value="深度清洁" />
            <el-option label="消毒处理" value="消毒处理" />
            <el-option label="维护保养" value="维护保养" />
          </el-select>
        </el-form-item>
        <el-form-item label="期望完成时间" prop="expectedTime">
          <el-date-picker
            v-model="form.expectedTime"
            type="datetime"
            placeholder="选择期望完成时间"
            style="width: 100%"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="清洁要求" prop="requirements">
          <el-input
            v-model="form.requirements"
            type="textarea"
            rows="3"
            placeholder="请描述具体的清洁要求"
            maxlength="300"
            show-word-limit
          />
        </el-form-item>
      </template>

      <!-- 设备封存 -->
      <template v-if="action === 'archive'">
        <el-form-item label="封存原因" prop="archiveReason">
          <el-select v-model="form.archiveReason" placeholder="请选择封存原因" style="width: 100%">
            <el-option label="设备老化" value="设备老化" />
            <el-option label="技术淘汰" value="技术淘汰" />
            <el-option label="长期闲置" value="长期闲置" />
            <el-option label="安全隐患" value="安全隐患" />
            <el-option label="其他原因" value="其他原因" />
          </el-select>
        </el-form-item>
        <el-form-item label="封存说明" prop="archiveNote">
          <el-input
            v-model="form.archiveNote"
            type="textarea"
            rows="3"
            placeholder="请详细说明封存原因和处理情况"
            maxlength="300"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="预计封存期" prop="archivePeriod">
          <el-select v-model="form.archivePeriod" placeholder="请选择预计封存期" style="width: 100%">
            <el-option label="1个月" value="1个月" />
            <el-option label="3个月" value="3个月" />
            <el-option label="6个月" value="6个月" />
            <el-option label="1年" value="1年" />
            <el-option label="永久封存" value="永久封存" />
          </el-select>
        </el-form-item>
      </template>

      <!-- 解除封存 -->
      <template v-if="action === 'activate'">
        <el-form-item label="解封原因" prop="activateReason">
          <el-input
            v-model="form.activateReason"
            type="textarea"
            rows="3"
            placeholder="请说明解除封存的原因"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="设备状态确认" prop="statusConfirm">
          <el-radio-group v-model="form.statusConfirm">
            <el-radio label="正常">设备状态正常，可以投入使用</el-radio>
            <el-radio label="需检修">设备需要检修后才能使用</el-radio>
            <el-radio label="需更换">设备需要更换部件</el-radio>
          </el-radio-group>
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSubmit">
          {{ submitButtonText }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  action: {
    type: String,
    default: ''
  },
  equipment: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const formRef = ref()
const loading = ref(false)

// 表单数据
const form = reactive({
  // 预约相关
  startTime: '',
  endTime: '',
  purpose: '',
  
  // 维修相关
  faultType: '',
  urgency: '中',
  description: '',
  contactPhone: '',
  
  // 清洁相关
  cleaningType: '',
  expectedTime: '',
  requirements: '',
  
  // 封存相关
  archiveReason: '',
  archiveNote: '',
  archivePeriod: '',
  
  // 解除封存相关
  activateReason: '',
  statusConfirm: '正常'
})

// 对话框标题
const dialogTitle = computed(() => {
  const titleMap = {
    reserve: '预约设备使用',
    maintenance: '设备故障报修',
    cleaning: '申请设备清洁',
    archive: '设备封存申请',
    activate: '解除设备封存'
  }
  return titleMap[props.action] || '设备操作'
})

// 提交按钮文本
const submitButtonText = computed(() => {
  const textMap = {
    reserve: '提交预约',
    maintenance: '提交报修',
    cleaning: '提交申请',
    archive: '确认封存',
    activate: '确认解封'
  }
  return textMap[props.action] || '确认'
})

// 表单验证规则
const formRules = computed(() => {
  const baseRules = {}
  
  switch (props.action) {
    case 'reserve':
      baseRules.startTime = [{ required: true, message: '请选择预约开始时间', trigger: 'change' }]
      baseRules.endTime = [{ required: true, message: '请选择预约结束时间', trigger: 'change' }]
      baseRules.purpose = [{ required: true, message: '请输入使用目的', trigger: 'blur' }]
      break
      
    case 'maintenance':
      baseRules.faultType = [{ required: true, message: '请选择故障类型', trigger: 'change' }]
      baseRules.urgency = [{ required: true, message: '请选择紧急程度', trigger: 'change' }]
      baseRules.description = [{ required: true, message: '请描述故障情况', trigger: 'blur' }]
      baseRules.contactPhone = [
        { required: true, message: '请输入联系电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
      ]
      break
      
    case 'cleaning':
      baseRules.cleaningType = [{ required: true, message: '请选择清洁类型', trigger: 'change' }]
      baseRules.expectedTime = [{ required: true, message: '请选择期望完成时间', trigger: 'change' }]
      break
      
    case 'archive':
      baseRules.archiveReason = [{ required: true, message: '请选择封存原因', trigger: 'change' }]
      baseRules.archiveNote = [{ required: true, message: '请输入封存说明', trigger: 'blur' }]
      baseRules.archivePeriod = [{ required: true, message: '请选择预计封存期', trigger: 'change' }]
      break
      
    case 'activate':
      baseRules.activateReason = [{ required: true, message: '请输入解封原因', trigger: 'blur' }]
      baseRules.statusConfirm = [{ required: true, message: '请确认设备状态', trigger: 'change' }]
      break
  }
  
  return baseRules
})

// 重置表单
const resetForm = () => {
  Object.keys(form).forEach(key => {
    if (key === 'urgency') {
      form[key] = '中'
    } else if (key === 'statusConfirm') {
      form[key] = '正常'
    } else {
      form[key] = ''
    }
  })
  
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 处理提交
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true
    
    // 构建提交数据
    const submitData = {
      equipmentId: props.equipment.id,
      action: props.action,
      ...form,
      userId: userStore.user?.id,
      userName: userStore.user?.name
    }
    
    // 根据操作类型调用不同的API
    await submitAction(submitData)
    
    ElMessage.success('操作成功！')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('操作失败:', error)
    
    // 处理不同类型的错误
    let errorMessage = '操作失败，请重试'
    
    if (error.response && error.response.data) {
      // 服务器返回的错误信息
      errorMessage = error.response.data.error || error.response.data.message
      
      // 处理验证错误
      if (error.response.data.details && Array.isArray(error.response.data.details)) {
        errorMessage = error.response.data.details.map(detail => detail.msg).join('; ')
      }
    } else if (error.message) {
      // 本地验证错误
      errorMessage = error.message
    }
    
    ElMessage.error(errorMessage)
  } finally {
    loading.value = false
  }
}

// 提交操作
const submitAction = async (data) => {
  switch (data.action) {
    case 'reserve':
      // 设备预约 - 确保时间格式正确
      const { createReservation } = await import('../api/reservation')
      
      // 验证必填字段
      if (!data.startTime || !data.endTime || !data.purpose) {
        throw new Error('预约信息不完整')
      }
      
      // 确保时间格式为ISO8601
      const startTime = new Date(data.startTime).toISOString()
      const endTime = new Date(data.endTime).toISOString()
      
      // 验证时间合理性
      if (new Date(startTime) >= new Date(endTime)) {
        throw new Error('结束时间必须晚于开始时间')
      }
      
      if (new Date(startTime) < new Date()) {
        throw new Error('预约时间不能早于当前时间')
      }
      
      await createReservation({
        equipmentId: data.equipmentId,
        startTime: startTime,
        endTime: endTime,
        purpose: data.purpose.trim()
      })
      break
      
    case 'archive':
      // 设备封存
      const { archiveEquipment } = await import('../api/equipment')
      await archiveEquipment(data.equipmentId, {
        archiveReason: data.archiveReason,
        archiveNote: data.archiveNote,
        archivePeriod: data.archivePeriod
      })
      break
      
    case 'activate':
      // 解除设备封存
      const { activateEquipment } = await import('../api/equipment')
      await activateEquipment(data.equipmentId, {
        activateReason: data.activateReason,
        statusConfirm: data.statusConfirm
      })
      break
      
          case 'maintenance':
        // 设备维修报告
        const { createMaintenance } = await import('../api/maintenance')
        await createMaintenance({
          equipmentId: data.equipmentId,
          faultDescription: data.description,
          priority: data.urgency
        })
        break
        
      default:
        // 其他操作（清洁等）暂时使用模拟
        console.log('暂未实现的操作:', data.action, data)
        break
  }
}

// 处理关闭
const handleClose = () => {
  visible.value = false
  resetForm()
}

// 监听对话框打开
watch(visible, (newVal) => {
  if (newVal) {
    resetForm()
  }
})
</script>

<style scoped>
.dialog-footer {
  display: flex;
  gap: 12px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-radio-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:deep(.el-radio) {
  margin-right: 0;
  margin-bottom: 8px;
}

:deep(.el-radio__label) {
  white-space: normal;
  line-height: 1.4;
}
</style> 