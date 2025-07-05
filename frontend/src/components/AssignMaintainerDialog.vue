<template>
  <el-dialog
    v-model="visible"
    title="分配维修员"
    width="500px"
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
      
      <el-form-item label="维修员" prop="maintainerId">
        <el-select 
          v-model="form.maintainerId" 
          placeholder="请选择维修员"
          style="width: 100%"
          filterable
        >
          <el-option
            v-for="user in maintainerOptions"
            :key="user.id"
            :label="user.name"
            :value="user.id"
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="预计完成时间" prop="estimatedCompletion">
        <el-date-picker
          v-model="form.estimatedCompletion"
          type="datetime"
          placeholder="请选择预计完成时间"
          style="width: 100%"
          :disabled-date="disabledDate"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSubmit">
          确定分配
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { assignMaintainer as assignMaintainerAPI } from '../api/maintenance'
import { getUserList } from '../api/user'

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
const maintainerOptions = ref([])

const form = reactive({
  maintainerId: '',
  estimatedCompletion: ''
})

const rules = {
  maintainerId: [
    { required: true, message: '请选择维修员', trigger: 'change' }
  ],
  estimatedCompletion: [
    { required: true, message: '请选择预计完成时间', trigger: 'change' }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    loadMaintainerOptions()
    resetForm()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const loadMaintainerOptions = async () => {
  try {
    const response = await getUserList({ role: 'teacher' })
    maintainerOptions.value = response.users || []
  } catch (error) {
    console.error('加载维修员列表失败:', error)
  }
}

const resetForm = () => {
  Object.assign(form, {
    maintainerId: '',
    estimatedCompletion: ''
  })
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

const disabledDate = (time) => {
  return time.getTime() < Date.now() - 8.64e7 // 不能选择今天之前的日期
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true
    
    await assignMaintainerAPI(props.maintenance.id, {
      maintainerId: form.maintainerId,
      estimatedCompletion: form.estimatedCompletion
    })
    
    ElMessage.success('维修员分配成功')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('分配维修员失败:', error)
    ElMessage.error('分配维修员失败: ' + (error.response?.data?.error || '网络错误'))
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