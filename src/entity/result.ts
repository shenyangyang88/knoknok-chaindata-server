export const success = (data: any) => {
  return {
    code: 0,
    resultMsg: "success",
    data: data
  };
};

export const failure = (code: number, errMsg: string) => {
  return {
    code: code,
    resultMsg: errMsg
  };
};

export class Result {
  code: string;
  resultMsg: string;
}