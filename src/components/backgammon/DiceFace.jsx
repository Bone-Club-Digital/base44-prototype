
import React from 'react';

const Dot = ({ color = 'white' }) => <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" style={{ backgroundColor: color }}></div>;

const Face1 = ({ dotColor }) => <div className="flex justify-center items-center h-full"><Dot color={dotColor} /></div>;

const Face2 = ({ dotColor }) => (
  <div className="flex flex-col justify-between h-full p-2">
    <div className="flex justify-start self-start"><Dot color={dotColor} /></div>
    <div className="flex justify-end self-end"><Dot color={dotColor} /></div>
  </div>
);

const Face3 = ({ dotColor }) => (
  <div className="flex flex-col justify-between h-full p-2">
    <div className="flex justify-start self-start"><Dot color={dotColor} /></div>
    <div className="flex justify-center self-center"><Dot color={dotColor} /></div>
    <div className="flex justify-end self-end"><Dot color={dotColor} /></div>
  </div>
);

const Face4 = ({ dotColor }) => (
  <div className="flex flex-col justify-between h-full p-2">
    <div className="flex justify-between"><Dot color={dotColor} /><Dot color={dotColor} /></div>
    <div className="flex justify-between"><Dot color={dotColor} /><Dot color={dotColor} /></div>
  </div>
);

const Face5 = ({ dotColor }) => (
  <div className="flex flex-col justify-between h-full p-2">
    <div className="flex justify-between"><Dot color={dotColor} /><Dot color={dotColor} /></div>
    <div className="flex justify-center"><Dot color={dotColor} /></div>
    <div className="flex justify-between"><Dot color={dotColor} /><Dot color={dotColor} /></div>
  </div>
);

const Face6 = ({ dotColor }) => (
  <div className="flex flex-col justify-between h-full p-2">
    <div className="flex justify-between"><Dot color={dotColor} /><Dot color={dotColor} /></div>
    <div className="flex justify-between"><Dot color={dotColor} /><Dot color={dotColor} /></div>
    <div className="flex justify-between"><Dot color={dotColor} /><Dot color={dotColor} /></div>
  </div>
);

const DiceFace = ({ value, playerColor = 'teal', isUsed = false }) => {
  const faces = {
    1: <Face1 dotColor={playerColor === 'teal' ? '#e5e4cd' : '#5a3217'} />,
    2: <Face2 dotColor={playerColor === 'teal' ? '#e5e4cd' : '#5a3217'} />,
    3: <Face3 dotColor={playerColor === 'teal' ? '#e5e4cd' : '#5a3217'} />,
    4: <Face4 dotColor={playerColor === 'teal' ? '#e5e4cd' : '#5a3217'} />,
    5: <Face5 dotColor={playerColor === 'teal' ? '#e5e4cd' : '#5a3217'} />,
    6: <Face6 dotColor={playerColor === 'teal' ? '#e5e4cd' : '#5a3217'} />,
  };

  const diceBackgroundColor = playerColor === 'teal' ? '#007e81' : '#e5e4cd';
  const opacity = isUsed ? 0.3 : 1;

  return (
    <div 
      className="w-8 h-8 md:w-12 md:h-12 rounded-lg transition-opacity duration-300" 
      style={{ 
        backgroundColor: diceBackgroundColor,
        opacity: opacity
      }}
    >
      {faces[value]}
    </div>
  );
};

export default DiceFace;
