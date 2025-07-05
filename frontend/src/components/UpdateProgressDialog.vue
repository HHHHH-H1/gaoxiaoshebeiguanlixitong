<template>
  <el-dialog 
    v-model="visible" 
    title="更新维修进度" 
    width="600px"
    @close="handleClose"
  >
    <el-form 
      ref="formRef" 
      :model="form" 
      :rules="rules" 
      label-width="100px"
    >
      <el-form-item label="工单编号">
      <el-input :value="maintenance?.ticketNo" disabled />
      </el-form-item>
      
      <el-form-item label="设备名称">
       <el-input :value="maintenance?.equipmentName" disabled />
      </el-form-item>
      
      <el-form-item label="维修状态" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio label="维修中">维修中</el-radio>
          <el-radio label="待验收">待验收</el-radio>
          <el-radio label="已完成">已完成</el-radio>
        </el-radio-group>
      </el-form-item>
      
      <el-form-item label="维修描述" prop="repairDescription">
        <el-input
          v-model="form.repairDescription"
          type="textarea"
          rows="4"
          placeholder="请详细描述维修过程和解决方案"
          maxlength="1000"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="维修费用" prop="cost">
        <el-input-number
          v-model="form.cost"
          :min="0"
          :precision="2"
          placeholder="请输入维修费用"
          style="width: 200px"
        />
        <span style="margin-left: 10px">元</span>
      </el-form-item>
      
      <el-form-item v-if="form.status === '已完成'" label="完成时间">
        <el-date-picker
          v-model="form.actualCompletion"
          type="datetime"
          placeholder="完成时间（可选，默认为当前时间）"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSubmit">
          更新进度
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { updateMaintenanceStatus, completeMaintenance as completeMaintenanceAPI } from '../api/maintenance'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  maintenance: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const loading = ref(false)
const formRef = ref()

const form = reactive({
  status: '维修中',
  repairDescription: '',
  cost: null,
  actualCompletion: null
})

const rules = {
  status: [
    { required: true, message: '请选择维修状态', trigger: 'change' }
  ],
  repairDescription: [
    { required: true, message: '请填写维修描述', trigger: 'blur' },
    { min: 10, message: '维修描述至少10个字符', trigger: 'blur' }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.maintenance) {
    resetForm()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const resetForm = () => {
  Object.assign(form, {
    status: props.maintenance?.status || '维修中',
    repairDescription: props.maintenance?.solution || '',
    cost: props.maintenance?.cost || null,
    actualCompletion: null
  })
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true
    
    const submitData = {
      status: form.status,
      repairDescription: form.repairDescription,
      cost: form.cost
    }
    
    if (form.status === '已完成') {
      // 使用完成维修接口
      await completeMaintenanceAPI(props.maintenance.id, submitData)
    } else {
      // 使用更新状态接口
      await updateMaintenanceStatus(props.maintenance.id, submitData)
    }
    
    ElMessage.success('维修进度更新成功')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('更新维修进度失败:', error)
    ElMessage.error('更新维修进度失败: ' + (error.response?.data?.error || '网络错误'))
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  visible.value = false
  resetForm()
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style> 