import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import socketService from '../services/socketService';
import Chat from '../components/Chat';
import PollHistory from '../components/PollHistory';
import Navbar from '../components/Navbar';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([{ text: '', isCorrect: true }]);
  const [duration, setDuration] = useState(60);
  const { currentPoll, results, timeRemaining } = useSelector((state) => state.poll);
  const { name } = useSelector((state) => state.user);
  const [showPollHistory, setShowPollHistory] = useState(false);

  useEffect(() => {
    // Initialize socket connection and join as teacher
    console.log('Teacher dashboard mounted, joining as:', name);
    socketService.connect();
    socketService.joinAsTeacher(name);

    return () => {
      console.log('Teacher dashboard unmounting, disconnecting socket');
      socketService.disconnect();
    };
  }, [name]);

  const handleAddOption = () => {
    if (options.length < 4) {
      setOptions([...options, { text: '', isCorrect: false }]);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], text: value };
    setOptions(newOptions);
  };

  const handleCorrectChange = (index, isCorrect) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], isCorrect };
    setOptions(newOptions);
  };

  const handleCreatePoll = () => {
    const validOptions = options.filter(opt => opt.text.trim());
    if (question && validOptions.length >= 1) {
      console.log('Creating new poll:', {
        question,
        options: validOptions,
        duration: duration * 1000
      });
      
      socketService.createPoll({
        question,
        options: validOptions.map(opt => ({
          text: opt.text,
          isCorrect: opt.isCorrect
        })),
        duration: duration * 1000
      });
      
      setQuestion('');
      setOptions([{ text: '', isCorrect: true }]);
    }
  };

  const calculatePercentage = (option) => {
    if (!results || Object.keys(results).length === 0) return 0;
    const totalVotes = Object.values(results).length;
    if (totalVotes === 0) return 0;
    
    const optionVotes = Object.values(results).filter(vote => vote === option.text).length;
    return Math.round((optionVotes / totalVotes) * 100);
  };

  const getVotesForOption = (option) => {
    if (!results) return 0;
    return Object.values(results).filter(vote => vote === option.text).length;
  };

  return (
    <>
      <Navbar 
        role="teacher"
        onShowPollHistory={() => navigate('/poll-history')}
      />
      <Container>
        <Header>
          <OnlineIndicator>Online Now</OnlineIndicator>
          <Title style={{ color: 'white' }}>Let's Get Started</Title>
          <Subtitle style={{ color: 'white' }}>
            You'll have the ability to create and manage polls, ask questions, and monitor
            your students' responses in real-time.
          </Subtitle>
        </Header>

        <PollCreator style={{backgroundColor: 'black' , border: '0.6px solid grey' }}>
          <QuestionSection>
            <QuestionLabel>Enter your question</QuestionLabel>
            <QuestionInput
              placeholder="Type your question here"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <DurationSelect
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
             >
              <option value="30" >30 seconds</option>
              <option value="60">60 seconds</option>
              <option value="90">90 seconds</option>
              <option value="120">120 seconds</option>
            </DurationSelect>
          </QuestionSection>
          <OptionsSection>
            <OptionsHeader>
              <OptionsTitle>Edit Options</OptionsTitle>
              <IsCorrectHeader style={{ color: 'black' }} >Is it Correct?</IsCorrectHeader>
            </OptionsHeader>
            {options.map((option, index) => (
              <OptionContainer key={index}>
                <OptionInputWrapper>
                  <OptionNumber>{index + 1}</OptionNumber>
                  <OptionInput
                    value={option.text}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder="Enter option text"
                  />
                </OptionInputWrapper>
                <CorrectOptions>
                  <CorrectOption
                    type="radio"
                    name={`correct-${index}`}
                    checked={option.isCorrect}
                    onChange={() => handleCorrectChange(index, true)}
                    id={`yes-${index}`}
                  />
                  <CorrectLabel htmlFor={`yes-${index}`}>Yes</CorrectLabel>
                  <CorrectOption
                    type="radio"
                    name={`correct-${index}`}
                    checked={!option.isCorrect}
                    onChange={() => handleCorrectChange(index, false)}
                    id={`no-${index}`}
                  />
                  <CorrectLabel htmlFor={`no-${index}`}>No</CorrectLabel>
                </CorrectOptions>
              </OptionContainer>
            ))}
            {options.length < 4 && (
              <AddOptionButton onClick={handleAddOption}>
                + Add More option
              </AddOptionButton>
            )}
          </OptionsSection>

          <AskButton onClick={handleCreatePoll} disabled={!question || options.filter(opt => opt.text.trim()).length < 1}>
            Ask Question
          </AskButton>
        </PollCreator>

        {currentPoll && (
          <ResultsSection>
            <ResultsHeader>
              <h2 style={{ color: 'white' }}>Live Results</h2>
              <TotalVotes>{Object.keys(results).length} votes</TotalVotes>
            </ResultsHeader>
            <Question >{currentPoll.question}</Question>
            <ResultsGrid>
              {currentPoll.options.map((option, index) => {
                const percentage = calculatePercentage(option);
                const votes = getVotesForOption(option);
                return (
                  <ResultBar key={index}>
                    <ResultBarHeader>
                      <OptionInfo>
                        <OptionDot isCorrect={option.isCorrect}>
                          {String.fromCharCode(65 + index)}
                        </OptionDot>
                        <OptionText isCorrect={option.isCorrect}>
                          {option.text}
                        </OptionText>
                      </OptionInfo>
                      <Percentage>{percentage}%</Percentage>
                    </ResultBarHeader>
                    <Progress>
                      <ProgressFill 
                        width={percentage} 
                        isCorrect={option.isCorrect}
                      />
                    </Progress>
                    <VoteCount>
                      {votes} {votes === 1 ? 'vote' : 'votes'}
                    </VoteCount>
                  </ResultBar>
                );
              })}
            </ResultsGrid>
            <Timer style={{ color: 'white' }}>Time remaining: {Math.ceil(timeRemaining / 1000)}s</Timer>
          </ResultsSection>
        )}
        <Chat isTeacher={true} />
      </Container>

      {showPollHistory && (
        <PollHistory onClose={() => setShowPollHistory(false)} />
      )}
    </>
  );
};

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 104px 20px 40px; /* Increased top padding for navbar */
`;

const Header = styled.div`
  margin-bottom: 40px;
`;

const OnlineIndicator = styled.div`
  display: inline-block;
  background: #6c5ce7;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  font-size: 32px;
  margin-bottom: 16px;
  color: #2d3436;
`;

const Subtitle = styled.p`
  color: #636e72;
  font-size: 16px;
  line-height: 1.5;
`;

const PollCreator = styled.div`
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(161, 147, 147, 0.1);
`;

const QuestionSection = styled.div`
  margin-bottom: 30px;
`;

const QuestionLabel = styled.div`
  font-size: 16px;
  color:rgb(208, 218, 221);
  margin-bottom: 8px;
`;

const QuestionInput = styled.input`
  width: 100%;
  padding: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 15px;

  &:focus {
    border-color: #6c5ce7;
    outline: none;
  }
`;

const DurationSelect = styled.select`
  width: 150px;
  padding: 10px;
  border: 2px solid rgb(19, 16, 16);
  color:rgb(21, 22, 22);
  border-radius: 8px;
  font-size: 14px;
  background: white;

  &:focus {
    border-color: #6c5ce7;
    outline: none;
  }
`;

const OptionsSection = styled.div`
  margin: 30px 0;
`;

const OptionsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const OptionsTitle = styled.h3`
  font-size: 16px;
  color:rgb(206, 226, 226);
  margin: 0;
`;

const IsCorrectHeader = styled.div`
  font-size: 14px;
  color: #636e72;
  margin-right: 50px;
`;

const OptionContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
`;

const OptionInputWrapper = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  margin-right: 20px;
`;

const OptionNumber = styled.div`
  width: 24px;
  height: 24px;
  background: #6c5ce7;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  margin-right: 10px;
`;

const OptionInput = styled.input`
  flex: 1;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;

  &:focus {
    border-color: #6c5ce7;
    outline: none;
  }
`;

const CorrectOptions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 120px;
  color:rgb(228, 245, 245);
`;

const CorrectOption = styled.input`
  margin: 0;
  cursor: pointer;
`;

const CorrectLabel = styled.label`
`;

const ResultsSection = styled.div`
  margin-top: 40px;
`;

const ResultsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const TotalVotes = styled.span`
  font-size: 14px;
  color: #666;
  background: #f1f2f6;
  padding: 4px 8px;
  border-radius: 4px;
`;

const Question = styled.div`
  font-size: 18px;
  font-weight: 600;
  color:rgb(233, 240, 241);
  margin-bottom: 20px;
`;

const ResultsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
`;

const ResultBar = styled.div`
  width: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 15px;
`;

const ResultBarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const OptionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const OptionDot = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => props.isCorrect ? '#4caf50' : '#f44336'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
`;

const OptionText = styled.p`
  font-size: 16px;
  color: ${props => props.isCorrect ? '#4caf50' : '#f44336'};
  font-weight: 500;
`;

const Percentage = styled.div`
  font-size: 16px;
  color: #2d3436;
  font-weight: 500;
`;

const Progress = styled.div`
  height: 12px;
  background: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
  margin: 10px 0;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${props => props.isCorrect ? '#4caf50' : '#f44336'};
  width: ${props => props.width}%;
  transition: width 0.3s ease;
`;

const VoteCount = styled.div`
  font-size: 14px;
  color: #636e72;
  margin-top: 5px;
`;

const Timer = styled.div`
  font-size: 14px;
  color: #636e72;
`;

const AskButton = styled.button`
  background: #6c5ce7;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
  width: 100%;

  &:hover {
    background: #5a4bd1;
  }

  &:disabled {
    background: #e0e0e0;
    cursor: not-allowed;
  }
`;

const AddOptionButton = styled.button`
  background: #6c5ce7;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
  width: 100%;

  &:hover {
    background: #5a4bd1;
  }
`;

export default TeacherDashboard;