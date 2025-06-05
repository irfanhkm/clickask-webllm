const fs = require('fs');
const path = require('path');

// Load test data from file
  const dataPath = path.resolve(__dirname, 'output_raw.json');
  const rawData = fs.readFileSync(dataPath);
  const testData = JSON.parse(rawData);

const mapped = testData.chatRooms.map(room => {
  // Find the assistant message content
  const assistantMessage = room.messages
    .find(msg => msg.role === "assistant");

  return {
    id: room.name,
    reply: assistantMessage ? assistantMessage.content : null
  };
});


const testingDataPath = path.resolve(__dirname, '../', 'testData_instruct.json');
const testingData = fs.readFileSync(testingDataPath);
const testDataInstruct = JSON.parse(testingData);
const result = [];

for (const testItem of testDataInstruct) {
    const data = mapped.find(data => data.id == testItem.id);
    if (data != null) {
        result.push({
            id: testItem.id,
            article: testItem.article,
            short_summary: testItem.short_summary,
            reply: data.reply
        })
    } else {
        console.log("error : {}", testItem);
    }
}

fs.writeFileSync("result_reply.json", JSON.stringify(result, null, 2), 'utf8');