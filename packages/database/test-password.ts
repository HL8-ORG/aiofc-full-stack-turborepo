import bcrypt from 'bcryptjs';

/**
 * 🔐 密码哈希测试脚本
 */

async function testPasswordHash() {
  console.log('🔐 密码哈希测试');
  console.log('===================');
  
  const plainPassword = 'password123';
  const existingHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewLGnEO.xGXq2kma';
  
  console.log('📝 测试密码:', plainPassword);
  console.log('🔒 现有哈希:', existingHash);
  console.log('');
  
  // 验证现有哈希
  const isValidExisting = await bcrypt.compare(plainPassword, existingHash);
  console.log('✅ 现有哈希验证:', isValidExisting ? '成功' : '失败');
  
  if (!isValidExisting) {
    console.log('');
    console.log('🔧 正在生成新的哈希...');
    
    // 生成新的哈希（测试多个轮次）
    for (const rounds of [10, 12]) {
      const newHash = await bcrypt.hash(plainPassword, rounds);
      const isValid = await bcrypt.compare(plainPassword, newHash);
      
      console.log(`轮次 ${rounds}:`);
      console.log(`  哈希: ${newHash}`);
      console.log(`  验证: ${isValid ? '成功' : '失败'}`);
      console.log('');
    }
  } else {
    console.log('✅ 现有哈希是正确的！');
  }
}

testPasswordHash().catch(console.error);
