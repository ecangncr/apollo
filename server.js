

const express = require('express');
const app = express();
const path = require('path')
const http = require('http').createServer(app);
const io = require('socket.io')(http);
require('./DB/dbConnection');
app.use(express.json());
const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.set('view engine','ejs');
app.use('/public', express.static(path.join(__dirname, 'public')))

const socketController = require('./Controllers/socketController');

//middlewares tanimlari

const hataYakalayici = require('./Middlewares/hataMiddlewares');


io.on('connection', (socket) => {


    socket.on('disconnecting', async () => {
      
      const response = await socketController.disconnect(socket.id);
      // brodcast yap ayrildi diye
      if(response.isTeacher){
        socket.to(String(response.gameID)).emit('offlineTeacher', {
          offlineTeacher:true
        });

      }
      else if(response.userID){
          socket.to(String(response.gameID)).emit('offlineUser', {
          userID:response.userID,
          userName:response.userName
        });
 
      }


    });

    socket.on('joinUsername', async (data) => {
        datax = {data,userSocketID:socket.id};
        const response = await socketController.joinUserName(datax)
        if(response.token){


          socket.join(data.gameID);

          socket.emit('joinResponse', response);
          socket.to(data.gameID).emit('newUser', {
            userID:response.userID,
            userName:response.userName
          });
        }
        else{
          socket.emit('alert', response);
        }
        
      });

      socket.on('joinUserNumber', async (data) => {
        datax = {data,userSocketID:socket.id};
        const response = await socketController.joinUserNumber(datax)
        if(response.token){


          socket.join(data.gameID);

          socket.emit('joinResponse', response);
          socket.to(data.gameID).emit('newUser', {
            userID:response.userID,
            userName:response.userName
          });
        }
        else{
          socket.emit('alert', response);
        }
        
      });





      socket.on('joinTeacher', async (data) => {
        const {userID,gameControllerToken} = data;
        const userSocketID = socket.id;
        const response = await socketController.joinTeacher(gameControllerToken,userSocketID);
        if(response.userID){
          socket.join(String(response.gameID));
          socket.emit('joinTeacherResponse', {joinTeacher:true});
        }
        else{
          socket.emit('alert', 'Bu oyun oluşturulamadı.Tekrar deneyiniz!');

        }
        
      });


      socket.on('kickUser', async (data) => {
        const {userID,gameControllerToken} = data;
        const response = await socketController.kickUser(userID,gameControllerToken);
        if(response.userID){
          io.in(String(response.gameID)).emit('kickedUser', {
          userID:response.userID,
          userName:response.userName
        });
        }
        
  
      });





      socket.on('startGame', async (data) => {
        const {gameControllerToken} = data;
        
        const response = await socketController.startGame(gameControllerToken);

        if(response.firstQuestions.soruText){
          
          io.in(String(response.gameID)).emit('newQuestion', {
          soruText:response.firstQuestions.soruText,
          options:response.firstQuestions.options,
          soruTime:response.firstQuestions.soruTime,
          kacinciSoru:response.firstQuestions.kacinciSoru,
          toplamSoru:response.toplamSoru

        });
        }
        else{
          socket.emit('alert', 'Bu oyun başlatılamadı.Tekrar deneyiniz!');

        }

        
        
  
      });


      socket.on('sendCevap', async (data) => {
        const {cevap,userToken} = data;
        const response = await socketController.sendCevap(cevap,userToken);
        
  
      });

      socket.on('getQuestionResult', async (data) => {
        const {gameControllerToken} = data;
        const response = await socketController.getQuestionResult(gameControllerToken);
        if(response.donut.correctAnswer!=null){
          socket.emit('renderQuestionResult',response.donut);
          if(response.answerUserSession!=[]&&response.nowAllAnswers!=[]){

            const userSocketDB = {};
            for(let x = 0;x<response.answerUserSession.length;x++){

              const key = response.answerUserSession[x].userID;
              const value =  response.answerUserSession[x].userSocketID;
              userSocketDB[key] = value;
            
            }

          
            for(let index = 0;index<response.nowAllAnswers.length;index++){
              const userID = response.nowAllAnswers[index].userID;
              const userSocketID = userSocketDB[userID]
              const donutx = {
                isCorrect:response.nowAllAnswers[index].isCorrect,
                questionPoint:response.nowAllAnswers[index].questionPoint
              }
              io.to(userSocketID).emit('userQuestionResult',donutx);
            
              
            }

          }
        }
        else{
          socket.emit('alert', 'Cevap Dağılımı oluşturulamadı.Tekrar deneyiniz!');

        }
        
  
      });


      socket.on('getScoreboard', async (data) => {
        const {gameControllerToken} = data;
        const response = await socketController.getScoreboard(gameControllerToken);
       
        if(response.errorMessage){
          socket.emit('alert', 'Bilinmeyen bir hata oluştu!');

        }
        else{
            if(response.isFinish){
              socket.emit('renderFinalboard',response);
            }else{
              console.log('oyun bitmedi');
              socket.emit('renderScoreboard',response);
            }
        }
          

        
      });

      socket.on('getNextQuestion', async (data) => {
        const {gameControllerToken} = data;
        const response = await socketController.getNextQuestion(gameControllerToken);
       
        if(response.nextQuestions.soruText){
          
          io.in(String(response.gameID)).emit('newQuestion', {
          soruText:response.nextQuestions.soruText,
          options:response.nextQuestions.options,
          soruTime:response.nextQuestions.soruTime,
          kacinciSoru:response.nextQuestions.kacinciSoru,
          toplamSoru:response.toplamSoru

        });
        }
        else{
          socket.emit('alert', 'Bu oyun başlatılamadı.Tekrar deneyiniz!');

        }
          

        
      });





  });
  
  


app.get('/',(req,res)=>{
    res.render('index.ejs');
})


//router tanimları
const TeachersRouter = require('./Routers/TeachersRouter');

const AktifGameRouter = require('./Routers/AktifGameRouter');

const KayitRouter = require('./Routers/KayitRouter');



app.use('/teacher',TeachersRouter);



app.use('/game',AktifGameRouter);

app.use('/kayit',KayitRouter);



app.use(hataYakalayici);

http.listen(3000,()=>console.log("expreess calisiyor"))